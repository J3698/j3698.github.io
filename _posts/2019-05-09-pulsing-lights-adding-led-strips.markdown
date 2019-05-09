---
layout: post
title: "Pulsing Lights: Adding LED Strips"
date: 2019-05-09
categories: reactive
thumb: /pics/thumb15.jpeg
---

In this post things get pretty cool - I'll add an LED strip to the project, and change the beat detection to be much more accurate. I've included a parts list at the end.

## Hooking up the LED Strips
Below  is a diagram of how I wired up the LED strip. You can find the Pi's pinout at [pinout.xyz](https://www.pinout.xyz).

{% include img.html src="../pics/LED_Strip_Setup.png" %}


The level converter is necessary because the Pi communicates with 3.3V, and the LEDs with 5V. It simply converts the low voltage (LV) 3.3V signals from the Pi to higher voltage (HV) 5V signals.

The LED strips themselves simply need a clock input, data input, five volts supply and ground.

## Installing libapa102
To program the LEDs I downloaded GitHub user [DirkWillem](https://github.com/DirkWillem)'s C library for APA102 LEDs. To install the library I cloned it in my visualizer folder:
<div class="code">cd ~/visualizer
git clone https://github.com/DirkWillem/libapa102.git
</div>

Next, I turned on SPI, the protocol that the LED strips use. To do so I ran <span class="code">sudo raspi-config</span>, selected <span class="code">Interfacing Options</span>, and then selected <span class="code">SPI</span>.

To test the library, I moved into the repository folder, made the examples, and ran one:
<div class="code">cd ~/visualizer/libapa102
make examples
cd examples
./pulseanim
</div>

{% include img.html src="../pics/pulse.gif" %}

## Improving the Visualizer
I added lights with the help of the [libapa102 docs](http://libapa102.dirkwillem.nl/), and switched to using the beat-detection algorithm detailed [here](http://archive.gamedev.net/archive/reference/programming/features/beatdetection/). The full new files are [simple_visualizer.c](https://gist.github.com/J3698/f32cc88daeefeb607dfdf080030332fb), [moving_average.c](https://gist.github.com/J3698/8122358691f778532e386b947adf8843), and [moving_average.h](https://gist.github.com/J3698/41714b49a8594450c7fba9ac6a4834f0). I'll just explain the update_lights and has_beat functions, and the moving average code I've written.

<script src="https://gist.github.com/J3698/ff73c5da9a8aa8ff3dc7a54066caf4c5.js"></script>

Function update_lights sets the LEDs to some shade of blue. If a beat is detected the blueness is set to full intensity, otherwise the lights decay until they are off. The decay effect ensures that short, abrupt beats are still visible, and is much better than a simple scheme where the lights are always full brightness or off.

<script src="https://gist.github.com/J3698/3cb2e56b7b4d130859ac5734870c0e74.js"></script>

Function has_beat uses a moving average to find beats. If the volume of a sample  is above the average by a certain factor (I chose 1.3), then there's a beat. This is more accurate than having a constant volume threshold for beats, as a song might have a quiet section that nonetheless contains beats.

Now I'll explain how my moving average code works. One way to calculate the moving average of the volume is to store the most recent n volume data points, and average them at every time step. Below I show three steps of a moving average that uses four data points. Note there's only a beat at t<sub>3</sub>, as that's the only time that the volume is significantly larger than the average.

{% include img.html src="../pics/easy_avg.png" %}

The above method for calculating a moving average is fine, but a bit slow. Notice that the sum for the average does not change much from step to step. The only difference is that the last term is thrown away, and a new term is added. We can use this fact to make calcuating the moving average a bit faster:

{% include img.html src="../pics/fast_avg.png" %}

## Writing a Makefile

A Makefile contains build instructions, and is run using <span class="code">make</span>. By only building out of date files, a Makefile makes building projects much faster. Writing a Makefile also means compile commands don't have to be memorized. This is the file <span class="code">~/visualizer/Makefile</span> I created for this project:

<script src="https://gist.github.com/J3698/b0a47789be5c9fe29ff0035a8a54276a.js"></script>

Each non-indented line is of the format <span class="code">target: prerequisites</span>. The indented commands underneath, called recipes, dictate how the target is made from the prerequisites. If any prerequisites are missing, the targets corresponding to them are created first. If a missing prerequisite has no target, the build fails. The first target is created first.

For this Makefile, visualizer is the first recipe. If <span class="code">simple_visualizer.c</span> or <span class="code">moving_average.c</span> don't exist, the build fails. Files ending in .a are library files, so if library file <span class="code">libapa102.a</span> exists, visualizer is compiled.

If library <span class="code">libapa102.a</span> doesn't exist, the <span class="code">libapa102.a</span> target will be built. This is done with the <span class="code">ar</span> command for creating archives. The exact meanings of the flags <span class="code">rcs</span> can be found in the man pages. Note that in a Makefile recipe <span class="code">$@</span> gets replaced with the target, and <span class="code">$^</span> with a list of the prerequisites.

## Testing and What's Next

After running <span class="code">make</span> in the folder <span class="code">~/visaulizer</span>, I ran it with <span class="code">./visualizer</span>. Then I connected my phone and tried it out. Here are the results:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/0izzz1nONxY" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

The moving average is sometimes slow to react to volume changes in the song, but usually catches up pretty well, making for some pretty good visualization. In the next post, I'll work on making this setup more mobile, with batteries and perhaps even charging.

---

**Parts**

* **Logic Level Converter -** You'll want one to communicate between the Pi and LEDs. You can get [this one](https://www.amazon.com/dp/B00ZC6B8VM) for about $3.
{% include limg.html src="../pics/llconverter.jpg"%}
* **APA102 Addressable RGB LED Strip (1x) -** For the visualizations. I got two of [these](https://www.sparkfun.com/products/14015) for $15 each, but one should be fine. If you get a different version of LEDs, make sure they take 5V, and that whatever communication protocol they use will work with the Pi.
{% include limg.html src="../pics/4wireled.jpg"%}
* **5v Power Supply -** I happen to have an adjustable power supply, but you can also buy a wall charger that outputs a fixed 5V for about $7.
{% include limg.html src="../pics/5vwall.jpg"%}

Parts Total: ~$25


