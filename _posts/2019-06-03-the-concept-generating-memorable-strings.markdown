---
layout: post
title: "The Concept: Generating Memorable Strings"
date: 2019-06-03
categories: urlmem
thumb: /pics/thumb18.jpeg
description: "In this post I explain how to generate memorable strings, and then
create and publish an NPM package for doing so."
---
Need to make an Amazon URL smaller to send to someone? Bitly is perfect for
that.

{% include img.html src="../pics/amazon-short.png" %}

Or maybe it's time to play a game of chess with a friend. Lichess will give you
a nice link to share. 

{% include img.html src="../pics/lichess-short.png" %}

These links are good in that they are short — but if you want to share links in
person or otherwise have to type one out, they could be more convenient.

Imagine how easy it would be to deal with this shortened URL:

<center>urlmem.com/chaskyho</center>

With this project I'm going to make a URL shortener that makes similar
easy-to-remember URLs by generating random words. In the process I'll also make
an npm package for people to generate their own random words (an npm package is
a library for node.js).

But first, let's dive into how the random words are generated.

## Understanding Markov Chains

To understand random word generation, we first have to understand Markov chains.
A Markov chain is a set of states, where from each state there is some
probability of transitioning into another state.

Here's an example of a Markov chain — it shows how I spend my time.

{% include img.html src="../pics/time-dfa.png" %}

Note that if I start by binging a show, there's a 95% chance I'll keep watching,
so I might spend the whole day watching.

On the other hand, It's not likely that if I start by studying, I'll binge a
show, and later go back to studying — those transitions happen with 5% and 1%
chance respectively.

These same kinds of transitions happen within words in the English dictionary.
For example, if a word contains "th" it's very likely "e" or "o" will
immediately follow, but unlikely that "g" will follow and create a word
containing "thg".

{% include img.html src="../pics/th-freq.png" %}

## Creating a Random Word

Now let's say we want something that looks like a real word, but isn't. First we
can randomly choose two starting letters, with the chance of choosing a
combination being proportional to how many times it shows up at the beginning of
English words. For example, if "th" starts 0.65% of words, we might choose "th"
with 0.65% chance.

Next we can choose one of the letters that occur after "th" in English words.
Some letters are more likely, so we'll weight the random choice based on the
frequency of the letters — we don't want "thg" to have a high chance of being
picked.

The letter "e" follows "th" 34% of the time, so with 34% chance say we pick "e",
resulting in "the". Now to make the word longer, we can use the same
randomization scheme to pick a letter that follows "he". Let's say we pick "a".
Our word is now "thea", and the current two letters are "ea".

If we continue this process until we have eight characters, our random word
might be something like "theablar". This looks like a word but isn't — perfect
for a shortened URL.

## Writing the Code

First we will have to build the Markov chain. Each prefix of two letters
will be mapped to a list of letters that follow, along with how many times each
of those letters follow the prefix.

The empty string will also be included as a prefix so that we can randomly pick
the first two letters.

Here's a snapshot of what the chain might look like:

<script src="https://gist.github.com/J3698/e6834336c435d34c3222315112a1aece.js"></script>

And here's <span class="code">createChain(words)</span>, which takes an array of
all the unpunctuated English words length greater than three, and creates the
associated chain:

<script src="https://gist.github.com/J3698/7831de8b5a9d034e40b86ceb0f86a7a8.js"></script>

To create a random word, we randomly pick two letters to start, and then
iteratively use the last two letters of the current random word to randomly
pick the next letter.

Here's <span class="code">randomWord(chain, length)</span>, which takes a chain
and a length of at least two, and returns a random word:

<script src="https://gist.github.com/J3698/790495215c73d2ef4b75b22d69e861a1.js"></script>

I've put together the two parts of code
[here](https://gist.github.com/J3698/986e2d2b7e5837f28eedde5d2804a9ca). To run
the code, download
[this dictionary file](https://gist.github.com/J3698/ee772052f610693401449b8164ba2ff5)
and place it in the same folder as the code. Make sure you have node installed,
and run <span class="code">node words.js</span>.

## Creating an NPM Package

To make the code into an NPM package, place the code and dictionary into an
empty folder and change the program's filename to
<span class="code">index.js</span>.

Next, run <span class="code">npm init</span>, and fill in the information given.
Many fields can ignored — just press enter without typing them in.

After filling in the information for npm init, create functions you want exposed
inside of exports. Here's the top of my <span class="code">index.js</span>:

<script src="https://gist.github.com/J3698/69dd4339789fb0e053d8dc6a3ccd64f2.js"></script>

Next, use <span class="code">npm login</span> to login to npm (create an account
at npmjs.org), and then run <span class="code">npm publish</span> in the package
directory.

I've published my module [here](https://www.npmjs.com/package/urlmem), and
published the code [here](https://github.com/j3698/urlmem), inside of the folder
<span class="code">npm-module</span>. As I update it, it may become a little
different from when I wrote this post.

## What's Next

Next up, I plan to write the front end for urlmem. It will be a react app — I
could probably use normal HTML/CSS/JS, but I feel react is an important
framework to know.
