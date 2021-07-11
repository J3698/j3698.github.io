---
layout: post
title: "Reimplementing Real-time Style Transfer with AdaIN"
date: 2021-07-05
edited: 2021-07-10
categories: adain
thumb: /pics/thumb26.png
---

A few decades ago (at least that's what it seems like) I explained AdaIn, a neural style-transfer method that I'm reimplementing for the OAK-1. In this post I'll actual reimplement AdaIn. After a quick recap I'll discuss loading the dataset. Then I'll go into writing the models and some intermediate tests. By the end, I'll show some stylized images.

Note that this post is a bit more technical than the last; feel free to skip towards the end if you'd like. Also, note that my goal is to go over what parts of the code are relevant to AdaIn, not to teach PyTorch from scratch.


## Recap

As a quick recap, here's how AdaIn works:

1. Encode the style and content images
2. Adjust the feature-map statistics of the content encoding to match those of the style encoding
3. Decode the adjusted content encoding into a stylized image
4. Compute a style loss and content loss for the stylied image (only during training)

Here's what this looks like if you're a pictures person:

{% include img.html src="../pics/stylecontentloss.png" %}

## Loading the Datasets

First up is to download the datasets. As in the AdaIn paper, the images we'll stylize are from the Microsoft Common Objects in Context (MS COCO) dataset, and the style images are from WikiArt. Both datasets have around 100,000 images.

MS COCO requires [this API](https://github.com/cocodataset/cocoapi). You should be able to install it as pycocotools from pip, but if that fails, you can install it from source. I ended up installing from source. While doing so, I had to reference [this issue](https://github.com/cocodataset/cocoapi/issues/172). Additionally, I had to run <span class="code">make install</span>, which I didn't see in the instructions.

After installing the API, the COCO website recommends downloading the dataset with gsync, but that method is widely reported to be broken. Luckily, I found the datasets at these links:

<div class="code">http://images.cocodataset.org/zips/train2017.zip
http://images.cocodataset.org/zips/val2017.zip
http://web.fsktm.um.edu.my/~cschan/source/ICIP2017/wikiart.zip
http://images.cocodataset.org/annotations/annotations_trainval2017.zip
</div>

Instead of using wget I used aria2 to download them, which can [significantly increase download speeds](https://askubuntu.com/a/507890/673865).

Here's the script I used:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdownload_data.sh&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>


The script downloads the files and moves them to a datasets directory. One thing to note is that the datasets do take up a lot of memory. Also, I got a few errors while unzipping the files... which I ignored...


Next up was writing the dataset class. PyTorch already includes dataset classes for MS COCO, and a generic dataset class that works for WikiArt, so I leveraged those.However, technically one datapoint is one image from both datasets, and thus a style transfer dataset would have size length(wikiart) * length(mscoco), or around 10 billion, which is not reasonable.

The IterableDataset class solves the big dataset problem; it doesn't decide ahead of time which datapoints will appear. On one hand this allows the model to always see new examples. However it wouldn't allow me to train the model on just a few examples, as new examples would always be chosen. Another fix is to pick a random fixed set of datapoints ahead of time; in this case the model wouldn't be seeing new data, but debugging on the same few examples would be easy. I ended up implementing both methods; the former for large-scale training, and the latter for debugging.

Now lets dive into the dataset code. I'll only explain the IterableDataset version, as I think there's more to learn there. The whole thing is [here](https://github.com/J3698/AdaIN-reimplementation/blob/main/data.py).

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdata.py%23L18-L21&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

This function returns the transforms we want to apply to each item in the dataset. One reason we resize is for memory efficiency. Additionally, throughout the model the dimension of the images get halfed repeatedly and then doubled repeatedly; if the dimension is ever odd before halving, then the input and output image sizes will be different, and we won't be able to compute a loss between them. The crop forces the model to be able to adapt more during training, but probably isn't necessary.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdata.py%23L24-L35&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

In the dataset constructor I create the MS COCO and WikiArt datasets and set the random seed used to pick new datapoints. Note that annotations for coco ("coco_annotations") aren't necessary for style transfer, but the PyTorch CocoCaptions dataset requires it as an argument, and I would like to re-use that class. I also have an "exclude_style" flag; this is because when I first tested the models, I didn't use the style images.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdata.py%23L41-L54&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

The next interesting function was \_\_iter\_\_. When multiple workers are used in PyTorch, the IterableDataset gets copied for each worker. So if we have four workers, four IterableDatasets will be preparing data in parallel. This is why I have a check for whether worker info is not None. If it is not None, the IterableDataset needs to set its random state so that it doesn't return the same datapoints as the other workers. It also has to change its length; if we set the dataset length to 32 and we have workers set to 4, each worker should return 8 items, not 32.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdata.py%23L59-L78&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Next, I wrote the \_\_next\_\_ function, which returns a new datapoint. It checks whether it should stop, and if not, returns a random image pair (or just one image, if exclude_style is specified). I also have a function <span class="code">_check_data_to_return</span>, this makes sure that I'm returning PyTorch tensors, not PIL images or something else by accident.


That's pretty much it for the IterableDataset class; in <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/tests.py"><span class="code">tests.py</span></a> I also wrote a <span class="code">test_data</span> function to make sure everything was working.


## The Encoder

For the models, I first wrote the encoder. This is a pretrained [VGG19 model](https://arxiv.org/pdf/1409.1556.pdf), with everything after the first ReLU of dimension 512 deleted.

I actually spent weeks trying and failing to get the whole system working because I figured I could use a VGG19 encoder that does not have batch-normalization layers. This was the one thing I had to check the original AdaIn repo for. I think unnormalized VGG19 fails because without the normalization, it's too hard for the decoder to match feature statistics.

Below I've included a diagram of the architecture. The first gray block represents the 256x256 RGB input image, the last gray block represents the final encoding, and each blue-red arrow represents a convolutional layer. I've omitted activation, batchnorm, and pooling layers in the diagram.

{% include img.html src="../pics/encoderArch.png" %}
<sup style="font-size:80%">[Diagram made here](http://alexlenail.me/NN-SVG/LeNet.html)</sup>

When we compute the style loss, we do so at various intermediate outputs of the encoder. So below I'm grouped the different layers into red blocks; the output of each block is used to compute part of the style loss. For example, the first red block looks like so:

convolution -> batch norm -> relu -> convolution -> batch norm -> relu

The output of second ReLU layer feeds into the next red block, and is also used to compute the style loss.

{% include img.html src="../pics/encoderArchGrouped.png" %}

Now let's go through the code.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fencoder.py%23L6-L12&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Ona high level, in the constructor we load the pretrained model, switch to using reflection padding, and also freeze the weights. The code for those functions is below:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fencoder.py%23L14-L33&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

I think most of this code speaks for itself. One thing to note is the weight freezing. The encoder represents what we know about images, so we don't want to train this; we keep it static. We can do this by preventing the weights from calculating their gradients. We also set the model to eval() mode, so that the batch normalization settings do not get updated during training.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fencoder.py%23L45-L48&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

On the same note, the train() method by default tells the model whether it should act as if it is training mode (and thus update things like batch normalization settings), or evaluation mode. So I overrode this method, preventing myself or others from accidently using the encoder in train mode.

The rest of the functions for this class more straightforward; e.g. passing the input through the model. If you are interested, read the rest [here](https://github.com/J3698/AdaIN-reimplementation/blob/post-two/encoder.py).

I also wrote a test function for the encoder in <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/tests.py"><span class="code">tests.py</span></a>.


## The Decoder

The decoder was a little bit more complicated. It's essentially the encoder but reversed.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdecoder.py%23L6-L13&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Again the constructor is a high-level overview. Method <span class="code">load_base_architecture</span> is a bit of a misnomer; this function loads the VGG19, but also reverses it and only takes out the layers we need. The other functions do what they say. We want to progressively grow the image size so we swap out the maxpools. Then we need to swap the direction of the now-reversed convolutional layers, and initialize them. Lastly, there's a fix we need to apply to the ReLU layers (more on this later).

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdecoder.py%23L15-L21&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

The first function loads, reverses, and truncates the VGG19 so we that we have the parts we want. The next function is doing what it says.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdecoder.py%23L23-L32&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

The next function reverses all of the convolutional layers. In the original architecture a layer might take in 256 feature maps, and output 512. Since we reversed the model, we now need that layer to take in 512 feature maps, and output 256. We also need to initialize the weights so that the model will train well; I use [Kaiming Initialization](https://arxiv.org/abs/1502.01852), which is designed for use when using ReLUs.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fdecoder.py%23L34-L37&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Lastly, I needed to set <span class="code">inplace</span> to <span class="code">False</span> for the ReLU layers. When set to True, a ReLU will overwrite its input, and then return the input. The problem is, to calculate gradients, a ReLU needs to know its original inputs. In other words, we need the ReLUs not to overwrite their inputs if we want to train the decoder.


As usual, I also wrote a test function for the decoder in <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/tests.py"><span class="code">tests.py</span></a>.


## Training for Reconstruction

I've skipped the AdaIn layer! To ensure the encoder / decoder worked nicely together, I first trained them to simply reconstruct an input. This is what that pipeline looks like:

{% include img.html src="../pics/reconstructpipeline.png" %}

Shoutout to [Jacob Lee](https://github.com/jacoblee628) for writing some of the initial training pipeline.

We simply encode and decode an image. The loss is the sum of the squared differences between the input and output.

If you would like to see the code for reconstruction, it is [here](https://github.com/J3698/AdaIN-reimplementation/tree/77f9c1f3a65bc0dcf9e93f9a94a2df6cf71deaed). However, it uses older versions of the encoder / decoder, and the code is a lot less clean (I wrote the unclean parts).

At first I trained on one image, on my CPU. This was the image I aimed to recosntruct:

{% include img.html src="../pics/0recon.png" %}

After 71 epochs however, I wasn't sure if things were progressing, and was growing concerned (very concerned; this part was not supposed to be hard):

{% include img.html src="../pics/71recon.png" %}

Interestingly however, the progress is much clearer if you are zoomed out (compare the input 0.png with 71.png); my guess is that this is because low frequency information might be learned first:

{% include img.html src="../pics/zoomoutrecon.png" %}

After this, I moved onto AWS to train a larger reconstruction demo using a GPU. I used a g4dn.xlarge AWS instance, though you could also use Google Collab (_much_ cheaper, less reliable). I won't get into the weeds here, instead I'll point you to a few valuable resources:

[CMU's Introduction to Deep Learning (Spring 21)](http://deeplearning.cs.cmu.edu/S21/index.html#recitations) - Recitation 0C and 0D are about deep learning with AWS and Collab.

[CMU's Introduction to Deep Learning (Fall 20)](http://deeplearning.cs.cmu.edu/F20/index.html#recitations) - Recitation 0D and 0E; different versions of the above.

Here are some of the reconstructions over time:

{% include img.html src="../pics/montage.jpg" %}

You can see the first and second reconstructions in the first row are pretty terrible, but the model quickly gets better and better at reconstructing the input image.
Another interesting thing I tried with reconstruction was using batch normalization in the encoder, and skipping initialization in the decoder. This saved time coding, but heavily impeded training, especially during initial experiments on only one image.

## The AdaIn Layer

With the encoder and decoder working, next was the AdaIn layer. This was more of a function than a layer; it doesn't need to keep track of any anything, and it's not a class.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fadain.py%23L1-L29&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

 I use PyTorch's built in <span class="code">instance_norm</span> to normalize the content encoding to zero mean and variance of one, and then shift the normalized encoding to match the means and variances of the target style encoding.

One thing to note is that in this code I have some dimension checks to make sure I didn't make any mistakes; these broke in early experiments with exporting the model for the OAK-1, so they will disappear later 😞.

As usual, I wrote a test in <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/tests.py"><span class="code">tests.py</span></a> for this layer too.

## The AdaIn Model

With all of the necessary components, I packaged everything up in a class <span class="code">StyleTransferModel</span>. It creates an instance of an encoder and decoder for itself. Here are the important methods it has:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Fadain_model.py%23L15-L26&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

We encode the style and content images, and then use AdaIn on encodings, and decode the stylized content encoding. Below I've labeled which lines of code do what on part of the training diagram.

{% include img.html src="../pics/stylecontentmodellabeled.png" %}

## The Training Pipeline

Now for the training pipeline. I'm going to completely skip over explaining <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/main.py"><span class="code">main.py</span></a>, <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/validate.py"><span class="code">validate.py</span></a>, and swathes of <a href="https://github.com/J3698/AdaIN-reimplementation/blob/post-two/train.py"><span class="code">train.py</span></a> as well. Most of main is dealing with argument parsing, and much of validate is already covered in what I'll cover in train. Also, a bunch of train is not specific to style transfer.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftrain.py%23L43-L70&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

First I'll start with the main training loop. On lines 43-53 I'm looping through the images and putting them on the GPU. On lines 63-70, I'm logging things so I can track training; <span class="code">write_to_tensorboard</span> does everything like validation etc., and I won't go over it here.

Lines 55-61 are where things are more interesting. I clear the gradients (56), calculate the loss (57-59), calculate the new gradients (60), and then update the model weights (61). Next we can look at the function used on line 57 in depth.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftrain.py%23L73-L79&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>

Line 74 does much of the heavy lifting; after that we calculate the loss from our various features and return it. The following diagram shows which line does what when we are calculating the loss.

{% include img.html src="../pics/losslabeledcrop.png" %}

The last two functions are responsible for actually calculating the style and content losses. They are below for completeness, but I will not talk too much about them.

The one thing I did do differently is that for many of the loss terms, I allow the default behavior of torch to take over, which is to average over certain dimensions, rather than sum over them. This means deeper features will not be weighted as much in the style loss, and also that my loss values are a lot lower.

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2FAdaIN-reimplementation%2Fblob%2Fpost-two%2Ftrain.py%23L82-L98&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on&showCopy=on"></script>


## Adventures in training...

As I mentioned, I probably spent weeks hunting bugs in my implementaiton. Hence why this post is months late. So before I say, "and now it works, ta-da!", I'd like to mention some experiments that I tried, and that failed, along with some ideas I had along the way.

First of all, I tried many many many experiments on just a few images. What I found was that generally, these gave quite good results. However, these experiments were still very sensitive to hyperparameters, such as the style-content tradeoff. Here is an examples (note this is before batchnorm in the encoder):

{% include img.html src="../pics/stranging.png" width="750px" %}

Bottom right is the original image. From left to right, top to bottom, the style loss weight is increasing. You can see that without enough style weight, the image ends up looking quite dark; content loss alone is not good enough to bring out the original image, at least not early on in training.

I also tried training with and without random cropping. Even for a few examples, that made quite a difference; convergence would be much slower, and images would take longer to look like they had any style.

After getting some to converge with small examples, I tried using a larger training dataset. What quickly happened is that the styles all converged to a muddy brown, with painting-like strokes. Basically, the styles were all the same. I also noticed the color of the final layer's biases was very close to the average color of the WikiArt dataset. Here's what things looked like:

{% include img.html src="../pics/bads.png" width="500px" %}

No amount of hyperparameter tuning, lowering of regularization, etc. would fix this problem at first. I burned a lot of AWS money. I also tried removing the bias in the last layer. This didn't really help.

Along the way I figured that weighing the style loss layers differently (maybe further enweight earlier layers) might help the color come out, as earlier layers are closer to the raw RGB data. This didn't really help. So I also tried another experiment; I played around with the loss function. At least one other style transfer paper doesn't take euclidean distance between style vectors, instead they calculate L2 loss. I tried both, and had the feeling that euclidean distance converged faster; I think it might be because the square root dampens the difference in effect of the various style losses, but I can't be sure.

This also lead me to discover that by default, the layer losses of the deeper layers are greater in magnitude.

All of the above problems were mostly fixed by adding batch normalization to the encoder. The time wasted sucked, but gave me some ideas. Would taking a larger root (rather than L2 norm) further improve the balance of the style losses? Would it matter? Does a bias in the last layer hurt the model? Would an encoder without batchnorm work okay, if the encoder was trained to ensure near-unity variances? Or perhaps if the decoder was a lot bigger? What if we enabled AdaIn at multiple points in the decoder?

I probably won't pursue most of these questions, as there are other parts of the project / other projects I want to get to. However I do think the time wasted led me to come up with deeper questions than I would have otherwise.


## Results

After finally adding those batchnorms, here is one of my my training curves (ignore the premature learning-rate scheduling):

{% include img.html src="../pics/loss_scheduled.png" %}

Furthermore, here are some stylizations throughout training; each triplet is shown in the order style image, content image, stylized image:

{% include img.html src="../pics/out1.png" width="750px" %}
{% include img.html src="../pics/out2.png" width="750px" %}
{% include img.html src="../pics/out3.png" width="750px" %}
{% include img.html src="../pics/out4.png" width="750px" %}


And that's it! I'm very happy to have this figured out; I definitely expected this whole project to done by now. But then again, that's how most of these go XD.

Anyhow, the next post should take a lot less time (fingers crossed), in part because I've already done some tinkering with getting models on the OAK-1. See you then!
