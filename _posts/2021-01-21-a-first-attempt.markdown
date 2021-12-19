---
layout: post
title: "A First Attempt With Deep Learning"
date: 2021-01-21
categories: puzzles
thumb: /pics/thumb26.png
---

Lichess, a top chess website, recently open-sourced its database of puzzles. I had the idea of predicting the rating (difficulty) of newly generated puzzles. While this isn't strictly necessary (lots of users means it won't take long to see how difficult a puzzle really is), it seemed like a fun idea, so here I am.

This first post will focus on loading the data, and a few first baselines at rating prediction. Note that I ran some (failed) baselines before writing this post, so parts of how things came to be are omitted (e.g. I didn't clean the dataset the 1st time).


## The Data

Each puzzle is of the following format: ID, FEN, Moves, Rating, Rating Deviation, Popularity, Plays, Themes, Game URL. Of these, I was mostly interested in "FEN" (start position), "Moves", and the rating and rating deviation.

The puzzles are available [here](https://database.lichess.org/#puzzles). In order to avoid the dataset changing on me, I also uploaded the version I'm working with [here](https://docs.google.com/uc?export=download&id=1G3d6nVyJjvdc7sv2ZCyD4gUmwnbVyF_d).

Looking at the distribution of the data, there are 797,589 puzzles. Here are a few visualizations I came up with:

Number of plays:

{% include img.html src="../pics/less40.png" %}

This figure shows that more than 10% of the puzzles have never been played; so I will likely remove games with less than 10 plays.

Rating deviation versus number of plays:

{% include img.html height="300px" src="../pics/Deviations.png" %}

This tells me more of the same; however at this point I was also unsure if rating deviation was actually useful; some puzzles with plays still have high rating deviations (a deviations of 500, for a puzzle played 50 times?). I will most likely throw out puzzles with very high deviations.


Distribution of ratings:

{% include img.html height="300px" src="../pics/distribution.png" %}

A lot of puzzles are new; so I assume that the huge "spike" are puzzles that haven't been attempted.

The script I used for visualizing the data is [here](https://github.com/J3698/puzzle-rating-prediction/blob/main/visualize_data.py); most of it is builtin pandas functionality.

## Loading the Data

In order to download / prepare the data, I wrote a script <span class="code">prepare_data.sh</span>, like so:

<script src="https://emgithub.com/embed.js?target=https%3A%2F%2Fgithub.com%2FJ3698%2Fpuzzle-rating-prediction%2Fblob%2Fmain%2Fprepare_data.sh&style=github&showBorder=on&showLineNumbers=on&showFileMeta=on"></script>

First it downloads the puzzles from my Google Drive if they haven't been already; then it calls other scripts to convert the "FEN" and "Moves" fields to vectors that can be used by a neural net, and to split the data into train, validation, and test partitions.

The train/validation/test split is so that I can train different techniques on the train dataset, and validate these experiments on the validation set. I will only look at test performance once I'm done. This is because the test set represents the real world, where I don't have the actual answer, and thus can't run another experiment if I'm not happy with results.



You can see that at max ~38% of the puzzles are predicted correctly. You'll also note that performance and time aren't correlated, which is a separate issue.

I'll also jump ahead and say that near convergence, on average predictions were 200+ rating points off.

With this in mind,
For my first




[actual rating - actual deviation, actual + deviation

Each puzzle has

Some of my initia

## Baselines


