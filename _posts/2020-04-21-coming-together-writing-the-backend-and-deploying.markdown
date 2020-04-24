---
layout: post
title: "Coming Together: Writing the Backend and Deploying"
date: 2020-04-21
categories: urlmemdraft
thumb: /pics/thumb22.png
---

<a href="https://UrlMem.com">UrlMem.com</a> is live! But note that future
changes might erase your shortened URLs...

In this post, I'll explain my thought process while writing UrlMem's backend,
and then the process of deploying the whole thing to Heroku. I'll also be making
some changes to the frontend.

## Frontend Changes
I made some minor changes to the frontend. Most noticable, I added animations to
the output boxes:

{% include img.html src="../pics/animation.gif" %}

I did this using React Transition Groups, which simply manages CSS transitions.
In order to do this, I also had to associate a key with every output box - I
simply used the index of the url pair as its key, or "id." The CSS is available
in
<a href="https://github.com/J3698/urlmem/blob/master/urlmem-app/client/src/App.css">App.css</a>,
here is the relevant React code:

<script src="https://gist.github.com/J3698/237dfe6912fff94575d75d3ba8706005.js">
</script>

In addition, I got the copy button to actually work. I considered making
the copy button adaptive - in which case it would hide when a user's browser
didn't support copying - but I decided against that, as
<a href="https://caniuse.com/#search=clipboard">caniuse</a> indicates that 95%
of users will have compatible browsers.

## The Backend API

The next step was to decide how the server and client would interact. I decided
that the server would have three endpoints as follows:

* <span class="code">/custom</span>
* <span class="code">/random</span>
* <span class="code">/[a-z]&#42;</span>

The <span class="code">/random</span> and
<span class="code">/custom</span> routes both take a long URL to shorten, while
the <span class="code">/custom</span> route also takes a custom shortening. A
typical shortening request might look like this:

<div class="code">https://urlmem.com/custom?longUrl=www.amazon.com&customUrl=boo
</div>

The <span class="code">/[a-z]&#42;</span> route catches any other requests. If
the request is a valid shortening, it redirects the user to the relevant
website. Otherwise, the user is redirected to the homepage.

## Writing the Backend

Now I'll go through some especially relevant parts of UrlMem's backend code -
the complete code (as of this post) is available
[here](https://github.com/J3698/urlmem/blob/master/urlmem-app/index.js).

Here follows the route for custom shortenings:

<script src="https://gist.github.com/J3698/31fdf73ef0f189382b5fae6fabf9944e.js">
</script>

First, the server checks if the required parameters were actually sent. The only
case that they wouldn't be is if someone was trying to make bad requests to the
website...

Then, the server creates the shortening if the custom URL requested isn't
already in use. The function <span class="code">customWordUnavailable</span>
also checks for things like the empty string - this prevents someone making the
shortening <span class="code">"" -> "TinyUrl.com"</span>. If they did, then any
request to UrlMem.com/ would redirect to TinyUrl. That would be bad.

Other than that, the only other code of note is this line:

<div class="code"
>app.use(express.static(path.join(__dirname, 'client', 'build')));
</div><!--__-->

This is only necesary for when things are deployed - when the React app is
built, an optimized version will be placed into
<span class="code">client/build</span>.

## Deploying

The first step to deploying was to ensure the latest version of the client was
built using <span class="code">npm run-script build</span> from the client
directory. At that point, running <span class="code">npm start</span> would run
the whole shebang - no need to use <span class="code">npm run start-dev</span>
as I showed two posts ago.

Next, I created a file <span class="code">.env</span> with the following
contents in the urlmem-app directory:

<script src="https://gist.github.com/J3698/145c1da416d42c74383c0764908b6b51.js">
</script>

This tells Heroku not to expose the source code (which matters for closed-source
projects).

Then, I updated package.json so that Heroku would know how to run things:

{% include img.html src="../pics/package-start-script3.png" %}

The postinstall script tells Heroku how build the frontend, while the start
script tells Heroku how to run the server. The additional dependencies are
required so that Heroku can build the React frontend.

Next, I [installed heroku](https://devcenter.heroku.com/articles/heroku-cli),
and from terminal ran the following commands:

<div class="code">heroku login
heroku create urlmem
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a urlmem
git push heroku master
</div>

Note that I ran <span class="code">git init</span> in order to create a
repository at the root of UrlMem's website code. I have UrlMem inside of a
larger repository, so if I hadn't done this, the whole larger repository would
have been pushed to Heroku.

## Adding a Domain Name

At this point, UrlMem was available at urlmem.herokuapp.com. The next step was
adding UrlMem.com. So I bought the domain name from Google Domains, and then ran
the following:

<div class="code">heroku domains:add www.example.com</div>

Next, from the DNS section for the domain at Google Domains, I added an
appropriate resource record:

{% include img.html src="../pics/resource-record.png" %}

I also set up subdomain forwarding:

{% include img.html src="../pics/subdomain-forward.png" %}

Subdomain forwarding ensures that UrlMem.com will forward to www.UrlMem.com. I
disabled SSL, as that would cost money.

I also enabled path forwarding, as I want UrlMem.com/stuff to forward to
www.UrlMem.com/stuff, rather than www.Urlmem.com.

## What's Next

Right now all of the URLs are saved in memory. So if I restart the server, or if
there is a crash, all of the url mappings are gone. A next step is to write
mappings into a databse to avoid this issue.

Additionally, one time I got back "bullsex." While the option for custom URLs is
a great fix for this, it would be cool to avoid returning bullsex in the first
place. One fix would be to reject words that contain "sex" and other interesting
subwords. A more interesting approach would be to implement pronounciation
prediction - thus the server would also pass over "bulsecs."

Stay tuned!

## Source<s>s</s>

[Tutorial: how to deploy a production React app to Heroku](https://medium.com/jeremy-gottfrieds-tech-blog/tutorial-how-to-deploy-a-production-react-app-to-heroku-c4831dfcfa08)
