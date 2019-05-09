---
layout: post
title: "It Works: A (Very) Simple Visualizer"
date: 2019-03-01
edited: 2019-04-28
categories: reactive
thumb: /pics/thumb12.jpeg
---


In this post I’m going to create a basic music visualizer based on beat detection. First I will install an audio API called JACK, then I'll write a JACK program to detect beats in music being played, setting the stage for more complicated visualizations. Here's a video of the end result that my friend Ryan Po helped me record - you can see that the printing of 1s and 0s is synced somewhat to the beat:
<iframe class="video" width="560" height="315" src="https://www.youtube.com/embed/6MBNSATvzGU" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Installing JACK
The Raspberry Pi comes with a version of JACK that needs to be uninstalled first. This is because the preinstalled version doesn't work when the Pi isn't running a desktop environment. To uninstall JACK, I ran the following commands:
<div class="code">sudo apt-get purge --auto-remove jack
sudo apt-get purge --auto-remove jackd</div>
I also had to check for and remove the files <span class="code">/usr/local/bin/jackd</span> and <span class="code">/usr/local/bin/jackd</span>.

The next step was to reinstall JACK. First I ran the following command to install necessary dependencies:
<div class="code">sudo apt install libasound2-dev jack-tools ant fftw3 qjackctl pulseaudio-module-jack</div>

Next I cloned, built and installed JACK2 by running the following commands from <span class="code">/home/pi</span>:
<div class="code">git clone https://github.com/jackaudio/jack2.git
cd jack2
./waf configure 
./waf build 
sudo ./waf install 
</div>

## Setting Up PulseAudio for JACK
By default, JACK doesn't play nicely with PulseAudio. To fix this, I edited <span class="code">/etc/pulse/default.pa</span>. There was a comment in the file that said <span class="code">Load audio drivers statically</span>, followed by a bunch of lines with load-module commands. After the last of these load-module commands, I added the following load-module commands:
<div class="code">load-module module-jack-sink
load-module module-jack-source
</div>

Here's the breakdown on why this fixes things: PulseAudio works by connecting audio sinks and sources. Chrome for example could be an audio source, where as a headphone jack could be a sink. On the other hand, JACK works by connecting input and output ports. Chrome would be an output port, and a headphone jack would be an input port. By adding JACK as an audio sink and source to PulseAudio, JACK is effectively run on top of PulseAudio, instead of as a competitor.

## Testing JACK
To test JACK, I compiled and ran a JACK program to output system ports. In headless mode I first ran the following command:
<div class="code">/usr/bin/jackd -dalsa -r44100 -p1024 -n2</div>

The command <span class="code">jackd</span> starts JACK in the background. The flag <span class="code">dalsa</span> tells JACK to use ALSA as the audio driver. All of the flags after this are specific to ALSA. The flags <span class="code">r44100 p1024</span> sets the sample rate to 44100 with data sent in chunks of 1024. The last flag, <span class="code">n2</span>, sets the latency of alsa to two chunks of data - the minimum. More options for running jackd are available on the jackd [man pages](https://github.com/jackaudio/jackaudio.github.com/wiki/jackd(1)).

Next, I wrote the program <span class="code">first_test.c</span> [available here](https://gist.github.com/J3698/e9ec85c337ac28846eb657728670865d). I compiled the program with the following command:
<div class="code">gcc -o test_program first_test.c -I/usr/local/include -L/usr/local/lib -ljack</div>
Then I ran the program; outputs may vary, but this is what I got:

{% include img.html src="../pics/port-list.jpeg" %}

## Running JACK on Startup
To start JACK automatically when the Pi powers up, I made some changes to the file <span class="code">auto-bt.sh</span>. Here's the top of that file before the changes:
<script src="https://gist.github.com/J3698/876191a8e340128e8d4d3a4674fe40ed.js"></script>
Here's the top of the file after the changes (the full changed file is [here](https://gist.github.com/J3698/7bd8a2deb056dc3021dcb9ae74eea853)):
<script src="https://gist.github.com/J3698/b85841293bddfbcd699eac8a1c2a2486.js"></script>

The only difference is that now before PulseAudio starts, JACK is given some time startup. There is probably a better way of knowing when JACK has started than to wait 10 seconds, but I've gone the waiting route for the sake of simplicity.

## Writing the Visualizer
The visualizer I wrote simply checks if the volume of a chunk of data is above a certain threshold, and if it is, prints out a line of ones, instead of a line of zeros. The file is rather long, so I've linked to the full file [here](https://gist.github.com/J3698/ecbdcda0531d0186a044b9c147a9e6e4), and I'll just go over the most important bit of code, the process method - every time new audio data comes in, this is the method that gets called:
<script src="https://gist.github.com/J3698/bd0be71270ed41e57b805f29b05637af.js"></script>

Once input data is retrieved and copied over to be played from the speaker, I simply sum the squares of the audio data points, and test if that total has gone over 0.3. I squared these values because originally, I wasn't sure if negative values were possible, and large negative values should also be counted as loud.

Note that on line 26 of this snippet I've commented out a print statement to print what the total actually is. At first only zeros would get printed - the threshold would never be passed. So I wrote that line to get a ball park estimate of what a good threshold would look like. Most totals were around 0.003, so I settled on that value as a threshold.

## Final Steps
In order to compile the visualizer, I ran the following command:
<div class="code">gcc -o visualizer simple_visualizer.c -I/usr/local/include -L/usr/local/lib -ljack -lm</div>
Then I restarted the Pi, waited a bit, connected my phone, turned on the music, and ran the program.

## What's Next
I'm pretty happy with how things are turning out - the visualizations aren't perfect, but there also weren't any significant bottlenecks or rough edges. So in the next post, I'll expand the visualizer - I'll move to LED lights rather than printing text on a screen, and consider more complicated beat detection algorithms.
