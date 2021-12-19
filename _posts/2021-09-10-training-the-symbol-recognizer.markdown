---
layout: post
title: "Training the Symbol Recognizer"
date: 2021-09-09
categories: extexify
thumb: /pics/thumb31.png
---

Time to train a model! As a recap, right now we have a backend talking to a frontend Overleaf extension:

{% include img.html src="../pics/rerender.gif" %}

Now, we will do a bunch of work preparing a data, and then we'll train a model. Next, we will revamp the server so that it can pass the data it recieves through our model.

## Some Design Decisions

I've made some interesting design decisions, so I want to explain those right out of the gate. First of all, the dataset I'll be using has information about how users draw the symbols. However, I will render everything into images, which will lose this information. I expect this may work better in purpose, as different people might draw symbols in a lot of different ways.

Second, I have not split up the model computation and the web server. This means that if the model takes a long time, the server will get backed up. I'm allowing for this because I don't know if I'll ever have hundreds of users, so it's not worth being able to support them right now (I'm building Lean).

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

After this, I actually go through all of the data and append it to a big list. Note that I have a lof of assertions here, just to make sure I understand the format of the data. I save the data as (N, 3) arrays. N represents the number of points in the drawing. The first two dimensions are the X and Y positions of each point in the drawing. The last dimension represents whether the user picked up their mouse / stylus at a given point.

<div class="code">while data != []:
    assert isinstance(data, list)
    for i in data:
        breakpoint()
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

I created a dataset class to hold the strokes, as initially I wasn't going to use images. Here's the constructor, which just normalizes each drawn symbol so that it's minimum and maximum coordinates are 0 and 1:

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

Another important bit here is that I had to split up the images into three sets: the train set, validation set, and test set. I won't show this, as it's not super involved. However, it turns out that because of how the image dataset class in PyTorch works, I had to be careful that every class of symbol was present in all three sets; otherwise I would get errors or unexpected results.

After I'd done this, one folder of images might look like so:

{% include img.html src="../pics/rendered_images.png" %}

At this point, I was ready to train.

## Training

<div class="code">criterion = nn.CrossEntropyLoss()

dataset_train = ImageFolder("./images_data32/train", transform = ToTensor())
dataset_val = ImageFolder("./images_data32/val", transform = ToTensor())
dataset_test = ImageFolder("./images_data32/test", transform = ToTensor())
train_loader = DataLoader(dataset_train, batch_size = batch_size,\
                          shuffle = True, num_workers = os.cpu_count())
val_loader = DataLoader(dataset_val, batch_size = batch_size, shuffle = False)
test_loader = DataLoader(dataset_test, batch_size = batch_size, shuffle = False)

model = Model()
model.load_state_dict(torch.load("Test.pt", map_location = torch.device("cpu"))["model"])
optimizer = optim.Adam(model.parameters(), weight_decay = 1e-4)
scheduler = lr_scheduler.StepLR(optimizer, step_size)
run_name = "Test"
train_model(run_name, model, criterion, optimizer, \
            scheduler, epochs, train_loader, val_loader, test_loader)
</div>

<div class="code">class Model(nn.Module):
    def __init__(self):
        super().__init__()

        self.layers = nn.Sequential(
                nn.Conv2d(3, 64, 3, 1, 1), nn.ReLU(), nn.BatchNorm2d(64),
                nn.Conv2d(64, 64, 3, 2, 1), nn.ReLU(), nn.BatchNorm2d(64),
                nn.Conv2d(64, 128, 3, 2, 1), nn.ReLU(), nn.BatchNorm2d(128),
                nn.Conv2d(128, 256, 3, 2, 1), nn.ReLU(), nn.BatchNorm2d(256),
                nn.Conv2d(256, 512, 3, 2, 1), nn.ReLU(), nn.BatchNorm2d(512),

                nn.AdaptiveAvgPool2d((1, 1)), nn.Flatten(),
                nn.Linear(512, 1098)
        )

    def forward(self, x):
        return self.layers(x)</div>


