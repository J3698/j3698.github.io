---
layout: post
title: "Getting Connected: Setting up the Raspberry Pi"
date: 2018-11-07
categories: reactive
thumb: /pics/thumb8.jpeg
---

The title says it all - in this post, I'll explain how I got my raspberry pi connected via bluetooth and the internet. Then I'll explain how I play music from my phone to a speaker connected to the raspberry pi.

## The Basics
The first step to hooking up the Raspberry Pi is to ensure that Raspbian is installed on it. If the Pi has NOOBS preinstalled, an option to install Raspbian will be shown once the monitor, mouse and keyboard are hooked up. Otherwise, you can use [these intructions](https://thepi.io/how-to-install-raspbian-on-the-raspberry-pi/) to install Raspbian.

The next step is to plug in a mouse, a keyboard, a display that supports HDMI, some way to connect to the internet, and a bluetooth dongle.

## Internet Connection
To connect to the internet, you can use an ethernet cable or purchase a wifi dongle (the dongle is easier). I started off with an ethernet cable because that's what I had on hand. I connected one end of the ethernet cable to my network-enabled laptop, and the other to the Pi. Getting this to work depends on what OS you use on the non-pi computer - for me I had to go to "wired settings", "IPv4 settings", and then to "connection type", which I changed to "share with other computers"; this will be operating-system dependent.

When I did switch to a wifi dongle, I couldn't connect to enterprise networks (such as my college's network). I had to manually connect using the answer given [here](https://raspberrypi.stackexchange.com/a/79238/93650).

After I was connected to the internet, I opened up terminal, ran "sudo apt install" and then "sudo apt upgrade" to ensure the pi was up to date.

## Bluetooth Audio
After the pi was connected to the internet, I changed the pi's name so that I would recognize it over bluetootoh. To do so, I followed [this](https://thepihut.com/blogs/raspberry-pi-tutorials/19668676-renaming-your-raspberry-pi-the-hostname) guide. In essence, run "sudo nano /etc/hostname" and change the name in that file (I chose "fancymusic"), and then run "sudo nano /etc/hosts" and change the name after "127.0.1.1".

The next step was to connect via bluetooth for audio through the pi's headphone jack. First I ran the command "sudo apt install pulseaudio-module-bluetooth". Then I rebooted the pi.

After the pi reboot, I ran "hciconfig" to determine the MAC address of the pi's bluetooth. It will be in the format "AA:AA:AA:AA:AA:AA".

Next, I ran "bluetoothctl", which opens a terminal command for controlling bluetooth. Then I ran "pairable on", next "discoverable on", then "agent NoInputNoOuput", and lastly "default-agent". On my phone, I paired with the pi. The pi appears as its name (in my case "fancymusic") or as the bluetooth mac address found earlier.

After the pairing, I could play music through my phone, and it would play through the monitor I'd connected to the pi. To force sound through the headphone jack instead, I had to run the command "amixer -c 0 cset numid=3 1". Some tutorials have other methods for making audio come out of the headphone jack instead of through the monitor, but none of those worked for me.

That's it for now - everything seems to be up and running. In the next post, I'll explain how to make this setup headless - without a monitor, anyone will be ale to automatically pair and play music to the pi.

{% include news.html %}

**Parts**
* **Mouse -** If you want to be able to use the raspberry pi, you'll probably want one of these. AmazonBasics keyboards are $14.
{% include limg.html src="../pics/mouse.jpeg" alt="A Mouse" %}
* **Keyboard -** See above. Amazon has them for $7.
{% include limg.html src="../pics/keyboard.jpeg" alt="A Keyboard" %}
* **HDMI Cable -** To connect the raspberry pi to the monitor. Amazon has them for $7.
{% include limg.html src="../pics/hdmi-cable.jpeg" alt="An HDMI Cable" %}
* **HDMI Capable Monitor -** To be able to use the raspberry pi - I suggest finding one around the house. A search for "small monitor" will yield results as cheap as $40.
{% include limg.html src="../pics/monitor.jpeg" alt="A Monitor" %}
* **Powered Speaker with 3.5" Audio Jack Input -** The raspberry pi has a 3.5" audio output to play music from. I got the Oontz Angle 3 to play music - it comes with a 3.5" audio output cable, is fairly loud for it's size, and costs $28.
{% include limg.html src="../pics/speaker.jpeg" alt="A Speaker" %}
* **Raspberry Pi and Power Source -** I used the Raspberry Pi 1 Model B+, which you can find with a power cable for $40 if you look hard. Otherwise, the newest version is ~$50 (it does come with bluetooth, though).
{% include limg.html src="../pics/pi.jpeg" alt="A Raspberry Pi" %}
* **Wifi Dongle (or ethernet cable) -** I used the "CanaKit Raspberry Pi WiFi Wireless Adapter" from Amazon, which I got for $10.
{% include limg.html src="../pics/wf-dongle.jpeg" alt="A Wifi Dongle" %}
* **Bluetooth Dongle -** I used the "Plugable USB Bluetooth 4.0 Low Energy Micro Adapter" from Amazon, which I got for $13. If you have a newer pi, you won't need one of these.
{% include limg.html src="../pics/bt-dongle.jpeg" alt="A Bluetooth Donle" %}
