---
layout: post
title: "OpenCV AI Kit: Writing a Model Pipeline"
date: 2021-09-19
categories: adain
thumb: /pics/thumb31.png
---


We're getting closer! So far we have a working style transfer model. However, we haven’t even started talking about moving models to the OpenCV AI Kit, and our current model is likely too big to do so. In this post, we'll handle that first problem; I'll walk through the process of getting a (super) simple model on the OpenCV AI Kit.

## Prerequisites

But first, let's have fun installing fun packages. My goal in this section is not to supply every requirement necessary, but to point in the correct direction.

Behind the OAK is the [DepthAI API](https://docs.luxonis.com/en/latest/). They have a first steps section, which will help get a pretrained model up and running on the OAK. I followed those steps [here](https://docs.luxonis.com/en/latest/pages/tutorials/first_steps/).

Upon running the demo <span class="code">python3 depthai_demo.py</span>, I could move the OAK-1 around and see its predictions about my environment. This showed that I had the basic dependencies installed correctly:

{% include img.html src="../pics/oak_demo.gif" %}

The next step was to install dependencies so that I could put custom models onto the OAK-1. For this we need something from Intel called OpenVINO. DepthAI has instructions for installing it [here](https://docs.luxonis.com/en/latest/pages/tutorials/local_convert_openvino/), but I found it a bit lacking. In particular, upon installing everything, I found some components were missing. Perhaps this is fixed, but in any case, on the [Intel website](https://docs.openvinotoolkit.org/latest/openvino_docs_install_guides_installing_openvino_linux.html), on the left hand side I found an option to install from APT, since I am on Linux.

Once I had added the correct installation repository using APT, I ran <span class="code">apt list | grep openvino</span> to view the installation candidates. I installed the <span class="code">dev</span> and <span class="code">runtime</span> packages of OpenVINO.

After installing on Linux, I now had a folder called <span class="code">/opt/intel/openvino_2021</span>. In this folder, the file that will be needed later was <span class="code">deployment_tools/model_optimizer/mo.py</span>. On a different OS, this will not be the case.

Additionally, in my <span class="code">~/.bashrc</span> I now had the line <span class="code">source /opt/intel/openvino_2021/bin/setupvars.sh</span>.

This was pretty much it in terms of dependencies.


## The Big Picture

Now that we have things installed, let's step back and look at how everything will fit together here. First, we train a model in PyTorch. Then, we can also use PyTorch to export that model to ONNX. Next, we use OpenVINO to optimize and convert the ONNX model into a different format. Afterwards, we use a web API to convert from that format into a blob that the OAK-1 can use. Lastly, we put the blob onto the model and run it. Here is what that looks like in diagram form:

{% include img.html src="../pics/pipeline.png" %}

And here is what that looks like in code, using a "test" model:

<script src="https://gist.github.com/J3698/33b9c00de822d8b5d5585cbe2a1867e8.js"></script>

Lines 3-5 perform model conversion, and the rest of the code runs the model.

## Exporting with ONNX

ONNX (Open Neural Network Exchange) is supposed to be a format for specifying any deep learning model, so the first step is to get from PyTorch to ONNX for a simple "test" model.  The "test" model just divide its input by two and return the output. While this seems super simple, it's not so different from style transfer; we need to do some transformation to the input and then return it. So this is a perfect first go.

I wrote the model export code in a file called <span class="code">export.py</span>. First I define the test model:

<script src="https://gist.github.com/J3698/e883a1e94069244c1341d8308726bde9.js"></script>

I think it speaks for itself :).

Next I use <span class="code">torch.onnx</span> to export the model. Here I create an instance of the model, and a test input that doesn't carry around gradients. The function <span class="code">torch.onnx.export</span> will run the input through to see what operations the model is using, and then use this information to convert to the ONNX format.

<script src="https://gist.github.com/J3698/04a01d11338cde5a0dd728886fcccfc1.js"></script>

After running this function, I get a <span class="code">test.onnx</span> file!

## Optimizing with OpenVINO

The next step is to optimize the model, which also moves from the ONNX format to whatever Intel is using. With my version of OpenVINO, and on Linux, this is what that looks like:

<div class="code"> python3 /opt/intel/openvino_2020.1.023/deployment_tools/model_optimizer/mo.py --input_model ./exports/test.onnx --data_type FP16
</div>

In  using this command, I'm using the model optimizer tool on the ONNX file, and also converting to 16-bit numbers. This will be faster and take up less memory then the original 32 or 64-bit numbers the model uses. The output of this command is a <span class="code">.bin</span>, <span class="code">.xml</span>, and <span class="code">.mapping</span> file.

Running this in Python looks a bit different; I have to call it using the subprocess library. I also move the outputs to the exports folder:

<script src="https://gist.github.com/J3698/3b6d70fc766549785a62e89a777de888.js"></script>

Running <span class="code">optimize_model("test")</span> now creates all of those intermediate outputs.

## Converting to a "blob"

Next is blob conversion. DepthAI have a nice API for this, so it's short and sweet:

<script src="https://gist.github.com/J3698/3cda3da3187dc1717dd2e37cdaaf8b12.js"></script>

Supposedly you can also do the blob conversion with <span class="code">deployment_tools/tools/compile_tool/compile_tool</span> under the OpenVINO installation. However, I found the outputs produced using that tool did not work on the OAK-1. This is probably a versioning problem.


## Creating the Pipeline

Next up was to create what depthaAI calls a "pipeline". This is a description of what the OAK-1 should be doing. The following code creates the pipeline:

<script src="https://gist.github.com/J3698/8139e8b8b1bf8a1fee6f9f4dcbdee031.js"></script>

You can see that we have three nodes, the camera input (cam_rgb), the neural network (detection_nn), and the output (xout_nn). These all get linked together, and then we return the entire pipeline.

## Running the Pipeline

The next step is to run this pipeline. I will include the code here, but it's not super noteworthy. We grab the last output of the pipeline, and do some wrangling so that it's in the format that OpenCV expects. Then, we use OpenCV to show the output in a preview window. Here it is:

<script src="https://gist.github.com/J3698/f14cebd835e7370c74fd88b881e74385.js"></script>

## Results

As a reminder, this is what the main method looks like:

<script src="https://gist.github.com/J3698/33b9c00de822d8b5d5585cbe2a1867e8.js"></script>

After running things, I get what I had earlier, but more dim (as everything is divided by two), and without the predictions (since my divide-by-two model has none of that):

{% include img.html src="../pics/oak_demo2.gif" %}


## Closing Thougts

At this point, we can get models on the OAK-1 very easily with the code we've setup (by running just one script!).

Though it seems this step was easy, I definitely lost many hours earlier this year trying to get this to work. I think a big part of this is because depthAI and the OAK-1 is very young (I backed the kickstarter a bit over a year ago). This means that some of the things that I got working more recently were a huge pain back in March. For one, the blob converter and model optimizer did not all show up in all versions of OpenVINO. Additionally, I ran into wierd compatibility issues that I could not figure out. I also ended up having to dig through the depthai C and Python code back then to try to find the usage that I wanted.

But trying to do all of that more recently, it just seems to work, and the documentation is much clearer. Which in retrospect, is to be expected of a budding project.

I'm quite certain we will hit some more roadblocks along the way, but for now, I think this is good progress. See you all next post!
