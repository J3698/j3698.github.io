---
layout: post
title: "Going Headless: Making the Pi a Wireless Speaker"
date: 2018-11-23
edited: 2018-03-6
categories: reactive
thumb: /pics/thumb10.jpeg
---
	
In this post I explain how I made the Pi automatically accept bluetooth connections and play music from devices without a monitor or user input. If you haven't already, I suggest reading the [previous post](https://antiprojects.com/reactive/getting-connected-setting-up-the-raspberry-pi) in this project.

## Running the Pi headless
The first step is to configure the Pi to boot into a CLI (command line interface) instead of the desktop since the desktop is slow and unnecessary for this application. I clicked the Raspbian menu, "Preferences", then "Raspberry Pi Configuration". Under "System" I changed the "Boot" option to "CLI". I also made sure auto login was enabled. Lastly I restarted the Pi.
{% include img.html src="../pics/headless.jpeg" alt="Open Config Program" %}
{% include img.html src="../pics/headless2.jpeg" alt="Open Config Program" %}
## The Auto-Connect Script
I wrote a script <span class="code">auto-bt.sh</span> that automatically pairs and connects with incoming bluetooth connections, and put it in the <span class="code">/home/pi</span> folder. Then in terminal, I ran <span class="code">chmod +x /home/pi/auto-bt.sh</span> to make the file executable; it's meant to be run with sudo. Here it is; you can [skip the explanation](#connect-on-boot) or follow along as I explain each part in detail:
<script src="https://gist.github.com/J3698/ff094945fe3a235fc0c46872ad10abe1.js"></script>

<div class="code">coproc stdbuf -oL bluetoothctl</div>
CLI program <span class="code">bluetoothctl</span> is for interacting with bluetooth devices - pairing, connecting, disconnecting, and more. The command <span class="code">stdbuf</span> runs bluetoothctl while buffering its output differently. The <span class="code">-oL</span> flag tells <span class="code">stdbuf</span> to buffer the **o**utput of <span class="code">bluetoothctl</span> by **L**ine - it's easier to work with bluetoothctl's data line by line. The command <span class="code">coproc</span> runs this whole command as our code does other things. It also points the output of bluetoothctl to <span class="code">COPROC[0]</span>, and the input to <span class="code">COPROC[1]</span>. These two variables contain what are called file descriptors.

<div class="code">sleep 5</div>
When we later run this script without the desktop environment, bluetoothctl will take some time to start bluetooth - so this command waits for 5 seconds. This isn't the most elegant solution, but I use it for the sake of simplicity.

<div class="code">sudo -u pi pulseaudio --start</div>
This command starts PulseAudio, which is necessary for bluetooth audio. PulseAudio won't start when run from root, but this script is run as root - so <span class="code">sudo -u pi</span> runs this command as the user pi. If you run this script while using the Pi's desktop environment, this line will output an error as PulseAudio runs automatically, but the script should still work. 

<div class="code">echo -e "pairable on\n" >& ${COPROC[1]}</div>
This line allows devices to pair to the Pi. The <span class="code">>&</span> operator routes the output on its left hand side to the input on its right-hand side, in this case bluetoothctl's input. Usually this operator is just <span class="code">></span>, but the <span class="code">&</span> is required since the right hand side is a file descriptor and not a file name.

On the right hand side the variable <span class="code">COPROC[1]</span> holds the file descriptor for the input of bluetoothctl. The <span class="code">${}</span> around it expands the variable into the file descriptor that it contains.

On the left hand side of the <span class="code">>&</span>, we see the echo command being used to output the command it's given. Here that's <span class="code">pairable on</span>, allowing devices to pair with the Pi. Since bluetoothctl wants input line by line, the <span class="code">-e</span> flag tells echo that <span class="code">\n</span> is a newline, not a slash and the character n.

<div class="code">echo -e "discoverable on\n" >& ${COPROC[1]}</div>
This line is formatted like the one above, but the command <span class="code">discoverable on</span> allows other bluetooth devices to see the Pi.

<div class="code">echo -e "agent NoInputNoOutput\n" >& ${COPROC[1]}</div>
An "agent" is some particular way of pairing bluetooth devices. The command <span class="code">agent NoInputNoOutput</span> tells bluetoothctl to pair using an agent that requires no interaction from the user, making pairing automatic.

<div class="code">echo -e "default-agent\n" >& ${COPROC[1]}</div>
The last command, <span class="code">default-agent</span>, makes the current agent (in this case NoInputNoOutput) the default agent for future pairings.

After bluetoothctl is set up, an infinite loop is run to pair and connect to incoming devices.

<div class="code">read -ru ${COPROC[0]} line</div>
This line reads the next line from the output file descriptor of bluetoothctl (<span class="code">COPROC[0]</span>) into a variable called line. The <span class="code">-r</span> flag tells the <span class="code">read</span> command not to treat special characters like <span class="code">\t</span> or <span class="code">\n</span> differently than other characters - we don't want data changed. The <span class="code">u</span> flag signifies that a file descriptor will be read from. 

<div class="code">echo $line</div>
This line is for debugging - it shows us what bluetoothctl output.

<div class="code">if [[ "$line" == \*"Paired: yes"\* ]]</div>
This if statement checks if a device is trying to pair or connect. When a device tried to connect or pair, bluetoothctl outputs a line containing <span class="code">Paired: yes</span>. The line will have other stuff too - the asteriks signify that the other stuff doesn't matter. The if statement uses <span class="code">[[ ]]</span> because they allow the use of these asteriks - if statements in bash can also be surrounded by <span class="code">[ ]</span>, <span class="code">( )</span>, or nothing at all, [according to ocassion](https://unix.stackexchannge.com/a/306115).

For reference, here is what <span class="code">$line</span> will look like when the if statement is entered:

<div class="code">^[[0;94m[Galaxy S9]^[[0m# ^M^[[K[^[[0;93mCHG^[[0m] Device AA:AA:AA:AA:AA:AA Paired: yes</div>

Here's the next line in the script:

<div class="code">mac=\`echo $line | awk '{print $(NF-2)}'\`</div>
This line puts the mac address of the device trying to connect or pair into the variable mac. The first segment <span class="code">echo $line |</span> passes the current line to text processing command <span class="code">awk</span>. Awk is a little complicated to explain here, but at a basic level it parses lines of text. The mac address of a connecting device is the third from last word in the line that contains "Paired: yes". In awk, $NF refers to the last word, so $(NF-2) refers to the MAC address of the connecting address.

<div class="code">echo $mac</div>
This line is for debugging - it should output the MAC address of the device trying to pair or connect, in the format "AA:AA:AA:AA:AA:AA".

<div class="code">echo -e "trust $mac" >& ${COPROC[1]}</div>
This line trusts the paired device so that it can connect automatically.

<div class="code">echo -e "connect $mac" >& ${COPROC[1]}</div>
This line connects to the newly-paired device. 

<div class="code">if [[ "$line" == *"Discoverable: no"* ]]</div>
This if statement checks if the bluetooth controller has stopped waiting for connections, if so the next line tells the controller to continue to wait for connections.

## <a name="connect-on-boot"></a>Connect on Boot
I used cron, a task scheduler for linux, to run a script automatically on startup. First I wrote the startup script cron would run, <span class="code">viz.sh</span> (short for vizualizer), put it in the <span class="code">/home/pi</span> folder, and ran <span class="code">chmod +x /home/pi/viz.sh</span>:

<script src="https://gist.github.com/J3698/ea861884280cba98375e49e8a8688a7a.js"></script>

Line 2 directs audio to the Pi's audio jack - I explain this exact line in depth in the [previous post](https://antiprojects.com/reactive/getting-connected-setting-up-the-raspberry-pi).

Line 3 starts the automatic bluetooth connection program from earlier - the ampersand starts the program in the backgroud, so that any audio processing done later can run even as devices are being connected and disconnected.

After creating the startup script, I ran <span class="code">sudo crontab -e</span>, and at the end of the file, added the following line: <span class="code">@reboot bash /home/pi/viz.sh</span>. This line tells cron to run the startup script whenever the Pi reboots. Cron has a lot of other functionality too - mostly to run commands at specific times, such as every Tuesday.

On the version of Raspbian I run, reboot cron jobs don't run. To fix this, I ran <span class="code">/etc/init.d/cron start</span>. Then I added the line <span class="code">/etc/init.d/cron start</span> to the end of file <span class="code">/etc/rc.local</span>, right before <span class="code">exit 0</span>.

After rebooting the Pi, I was able to pair and connect my phone, and music would play from the speaker connected to the Pi. Next time, we'll see a (very) bare-bones visualizer emerge.

{% include news.html %}
