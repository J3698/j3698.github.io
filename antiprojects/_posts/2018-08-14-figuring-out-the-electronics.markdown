---
layout: post
title: "Figuring Out the Electronics"
date: 2018-08-14
categories: longboard
thumb: /pics/thumb3.jpeg
---

This post is all about the electronics - first I'll detail how I planned the electronics, and then I'll show I mounted the electronics under the board. As usual, I include a parts list at the end.


## **The Big Picture**
{% include img.html src="../pics/elec-vision.png" alt="diagram" %}
The big picture for the electronics is for a charging system to supply power to two different battery systems. One battery system will power the motor, and the other will be for the lower power electronics, such as the lights, bluetooth reciever, and circuitry used to control the motor.

## **Battery and Charging**
{% include img.html src="../pics/charging-vision.png" alt="diagram" %}
Let's take a deeper look at the charging system. On the accessory side of the electronics, we have a buck conveter - this efficiently changes the 24 volts from the power jack to the 11.1 the 3S battery expects while charging. The buck converter I got is also CC CV. This means that in addition to having a knob to adjust voltage output (CV - constant voltage), the buck converter has a knob to limit output current (CC - constant current). Lipo batteries are generally charged using a CC CV supply.

On the motor side of the electronics, we have a boost converter. This will efficiently change 24 volts to the 25.6 expected by the bigger 6S battery. The diode following the boost converter will stop current from travelling backwards towards the other side of the electronics. If the diode wasn't present, the 6S battery would end up charging the 3S battery, potentially damaging itself in the process, as its own voltage sank lower and lower.

Note that each battery also has a voltage monitor and a balance connected. The balance makes sure that the cells in the batteries are at the same voltage (this increases the lifepsan of the battery), and the monitor goes off if a battery is dangerously low on charge.

## **Low Power Electronics**
{% include img.html src="../pics/lowp-vision.png" alt="diagram" %}
Zooming in on low power electronics side, after the battery, we have a switch to power the board on and off. Then a buck converter changes the 3S's 11.1 volts to 6 volts, which the lights and Arduino are happy with. The piezo horn and bluetooth module get 5 volts from the Arduino, but the relay board uses a regulator for its 5 volts because the Arduino can't give it the current that it wants.

The Arduino is the brains of the board - it runs code to control everything else. It takes input from the bluetooth module, which it also powers. Because everything depends on the arduino, everything stops if the Arduino becomes too busy with one particular task. For this reasons, it might be wise to use two Arduinos in the future.

The lights are controlled by the Arduino, but powered from the buck converter, as they can use up to 7 amps of current. For the most part, they're just for show.

The piezo horn is pretty straight forward - it takes a DC voltage in, and makes a loud noise. It might be wise to power it through a relay in the future - it can operate with anywhere from 5 volts to 8 volts, so it doesn't reach its loudness potential using the Arduino's 5 volts.

The motor relay is actually two relays. The first is  




