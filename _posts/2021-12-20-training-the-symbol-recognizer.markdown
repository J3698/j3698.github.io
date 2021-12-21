---
layout: post
title: "Training the Symbol Recognizer"
date: 2021-12-20
categories: extexify
thumb: /pics/thumb32.png
---

Time to train a model! In this post, we will do a bunch of work preparing data, and then we'll train a deep neural network to classify symbols.

As a recap, right now we have a backend talking to a frontend Overleaf extension:
{% include img.html src="../pics/rerender.gif" %}

## Stroke VS Image Representation 

I want to explain one of my design decisions right out of the gate. Note that the digital symbol drawings can be represented either as lists of points in mouse strokes, or as images.

{% include img.html src="../pics/stroke_v_image.png" %}

The dataset I'll be using uses the stroke information, but I will be transforming it into image representation. Although this loses information about the order in which strokes were drawn, I expect this may be more robust, as different people might draw symbols in lots of different ways.

Also, ONNX, which can be used to deploy models in the browser, did not properly support LSTM models (preferred for stroke representation)  when I started this project. That's the real reason.


## Reading the Data From a Databse

The dataset I'm using is from [here](https://github.com/kirel/detexify-data). It's the dataset from detexify, the project I'm emulating / improving upon. The author decided to use a database to store the data, however I'm more comfortable with numpy, so my first order of action was to export this database to numpy.

Note that I already have Postgres installed so that I can work with the SQL databse easily; if you don't, you would have to setup Postgres or another SQL databse first.

After downloading the database, I ran the following command to save the databse:

<div class="code">sudo -u postgres psql -f detexify.sql</div>

Next, I wrote a script <span>read_from_database.py</span>, which I'll now go through:

<div class="code">import psycopg2
import numpy as np
from tqdm import tqdm</div>

Tqdm is for progress pars, and psycopg2 is for reading databases.

Next, I connect to the database, and get the number of datapoints:
<div class="code">conn = psycopg2.connect(database="extexify", user='myusername', password='mypassword', host='127.0.0.1', port= '5432')
cursor = conn.cursor()

cursor.execute("select count(*) as count_samples from samples")
number_of_data = cursor.fetchall()[0][0]</div>


Then, I prepare to read 5,000 datapoints at a time out of the database:
<div class="code">cursor.execute("select * from samples")
per_time = 5000
data = cursor.fetchmany(per_time)
datasX = []
datasY = []
pbar = tqdm(total=number_of_data) # make our progress bar</div>

After this, I actually go through all of the data and store it in a large list. Note that I have a lof of assertions here, just to make sure I understand the format of the data. For each point in each stroke, I store the x coordinate, y coordinate, and then a 1 or a 0 depending on whether the user ended the stroke at the given point.

<div class="code">while data != []:
    assert isinstance(data, list)
    for i in data:
        assert isinstance(i, tuple)
        assert len(i) == 3
        assert isinstance(i[0], int), type(i[0])
        assert isinstance(i[1], str), type(i[1])
        assert isinstance(i[2], list), type(i[2])
        assert all([isinstance(j, list) for j in i[2]]), [type(j) for j in i[2]]
        assert all([len(l) == 3 for j in i[2] for l in j])

        x = [np.pad(np.array(j).reshape((-1, 3)), ((0, 0), (0, 1))) for j in i[2]]
        for stroke in x:
            stroke[-1, -1] = 1

        datasX.append(x)
        datasY.append(i[1])

    pbar.update(per_time)
    data = cursor.fetchmany(per_time)</div>

Lastly, I save and close everything:

<div class="code">pbar.close()
np.save("dataX.npy", np.array(datasX))
np.save("dataY.npy", np.array(datasY))
conn.close()</div>

At this point, I had a <span class="code">dataX.npy</span> and a <span class="code">dataY.npy</span> to load data from, rather than the database.


## Rendering Points into Images

As I'm viewing this as an image classification problem, the next step was to load these points and convert them into images. In retrospect, I could have combined this step with the previous step. However, initially I wasn't sure I wanted to convert from points to images, so these are separate steps.

I created a dataset class to hold the strokes, as initially I wasn't going to use images. Here's the constructor, which just normalizes each drawn symbol so that it's minimum and maximum coordinates are 0 and 1 respectively:

<div class="code">class ExtexifyDataset(torch.utils.data.Dataset):
    def __init__(self, strokes_file = "data_processed/dataX.npy",\
                       labels_file = "data_processed/dataY.npy",\
                       strokes_labels = None):
        if strokes_labels is not None:
            self.strokes, self.labels = strokes_labels
        else:
            strokes = np.load(strokes_file, allow_pickle = True)
            labels = np.load(labels_file, allow_pickle = True)
            print("Loaded file")
            assert all([i.shape[1] == 4 for s in strokes for i in s])

            self.strokes = [torch.tensor(np.delete(np.vstack(stroke), 2, axis = 1)).float() \
                            for stroke in tqdm(strokes)]
            self.normalize_strokes()
            print("Processed strokes")

            labels_dict = {l: i for i, l in enumerate(sorted(set(labels)))}
            self.labels = torch.tensor([labels_dict[i] for i in labels])
            print("Processed labels")

            assert len(self.strokes) == len(self.labels)


    def normalize_strokes(self):
        for i, stroke in tqdm(enumerate(self.strokes), total = len(self.strokes)):
            stroke[:, :2] -= stroke[:, :2].min(dim = 0).values
            stroke[:, :2] /= (stroke[:, :2].max(dim = 0).values + 1e-15)
            stroke[:, :2] *= 0.95
            stroke[:, :2] += 0.025
</div>

Note that I actually use some padding when normalizing strokes; this is because otherwise, points on the edge of the images wouldn't show.

The next two functions for the dataset class are the \_\_len\_\_ and \_\_getitem\_\_ functions. The former tells whateve uses the dataset how long it is, and the latter returns the ith piece of data. Here they are:

<div class="code">    def __len__(self):
        return len(self.strokes)

    def __getitem__(self, idx):
        return self.strokes[idx], self.labels[idx]</div>

The other important function in this file was <span class="code">create_image</span>. When I loop through the dataset, I call this function to create the images before I save them to a directory. Here it is:

<div class="code">def create_image(size, stroke):
    image = Image.new("L", (size, size), color = 0)
    draw = ImageDraw.Draw(image)
    for j in range(len(stroke) - 1):
        if stroke[j, 2] != 1:
            p1 = (stroke[j, :2].numpy() * size).tolist()
            p2 = (stroke[j + 1, :2].numpy() * size).tolist()
            draw.line(p1 + p2, fill=255, width=1)
        else:
            p1 = (stroke[j, :2].numpy() * size).tolist()
            draw.point(p1, fill=255)

    p1 = (stroke[-1, :2].numpy() * size).tolist()
    draw.point(p1, fill=255)

    return image</div>

Here I'm looping through the strokes, and drawing them to the image. I also have to manually draw the last point in the image, otherwise it won't always appear.

## Train / Val / Test Splits

Another important bit here is that I had to split up the images into three sets: the train set to learn the model, the validation set to tune the model, and the test set (which I never really used). I won't show [this script](https://gist.github.com/J3698/e8435a161de4ffc5d5fcfdda948f1f1e), as it's not super involved.

However, there was one sticking point on account of how the image dataset class in PyTorch works. Note that the PyTorch image dataset class first orders the classes by name, and then assigns a number to each class. Here's how that might play out if we have a training dataset, validation dataset, and test dataset:

{% include img.html src="../pics/split_error.png" %}

Note that since the test dataset doesn't have the "Equals" class, it assigns Nabla the number 3, instead of 4. This will cause all sorts of pain later on. For this reason, I had to ensure that each symbol was in all three sets. I found this out the hard way, and ended up having to read through the source code of PyTorch's image dataset. I might try to update their documentation later.

However, after I'd fixed this issue, one folder of images might look like so:

{% include img.html src="../pics/rendered_images.png" %}

At this point, I was ready to train.

## Training

I'll go over some high-level details of training, but the [pytorch tutorials](https://pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html) explain things better than I can. I use the Adam to optimize the model since it's well known, and I also use weight decay to prevent the model from just memorizing the training data. During training, I put batches of 512 images through the model at once.

I stop training the model once the top-5 accuracy levels off. In other words, if the correct symbol is one of the models top 5 predictions, I count the model output as correct. I choose top-5 accuracy as my metric since I show the user the top 5 predictions.

For the model itself, I use the following architecture:

<div class="code">2D Convolution (64 channels, filter size 3x3) ->
ReLU -> BatchNorm ->
2D Convolution (64 channels, filter size 3x3, stride 2) ->
ReLU -> BatchNorm ->
2D Convolution (128 channels, filter size 3x3, stride 2) ->
ReLU -> BatchNorm ->
2D Convolution (256 channels, filter size 3x3, stride 2) ->
ReLU -> BatchNorm ->
2D Convolution (512 channels, filter size 3x3, stride 2) ->
ReLU -> BatchNorm ->
Average Pool to 1x1 ->
Linear (1098 outputs)
</div>


There isn't much rhyme or reason to this model; it's simple, and works. Before the average pooling layer the network output is 2x2x512; the pooling averages the image so that it is 1x1x512. The linear layer has 1098 outputs, one for every symbol in the dataset.


This models ends up getting; almost 99% top-5 accuracy, which seems good enough for me. I used Google Colab to train the model in 20 minutes. I pay for Colab, but it's also available free. There should be a public Colab recitation available at [this course website](https://deeplearning.cs.cmu.edu/F20/index.html) if you would like to learn how to use it.


Again, if you're interested in training an image model, the [pytorch tutorials](https://pytorch.org/tutorials/beginner/blitz/cifar10_tutorial.html) are great. My own code for training the model should be public soon [here](https://github.com/J3698/extexify/blob/main/train2.py). 

