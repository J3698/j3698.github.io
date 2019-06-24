---
layout: post
title: "The Foundation: Setting up a React/Express App"
date: 2019-06-23
categories: urlmem
thumb: /pics/thumb19.jpeg
---

While writing the post about creating UrlMem's front end, I realized there's a
lot to setting up a React app with an Express backend.

There are many five minute tutorials detailing how to do so - but they end
up under explaining the good bits.

So this post will be dedicated to explaining and setting up a minimal React
app with Express in the backend.

At the end of this post I've compiled the sources I used.

## Why Express

Express is a routing library for Node.js. A router lets us decide what a user sees
when they visit different parts of our website. For example, I could create a
route for urlmem.com/, and different route for urlmem.com/hi.

In UrlMem's case, I'll probably have a route for urlmem.com/ that leads to home,
and a route for urlmem.com/\* that looks at whatever is in place of
"\*", and redirects to the associated longer url.

## Creating The Express App

In terminal I created a new folder for the project, and inside of that folder
initialized the project using <span class="code">npm init</span> - the
information given to <span class="code">npm init</span> isn't especially
important, although the application entry point should be index.js:

<div class="code">mkdir urlmem-app
cd urlmem-app
npm init
</div>

Next I installed Express using the <span class="code">\-\-save</span> flag to add
it as a dependency to the project.

<div class="code">npm install express --save
</div>

Then I created a program <span class="code">index.js</span>, with a route for
/greet:

<script src="https://gist.github.com/J3698/63b0e0f448bd20aeef6eb062aba59901.js">
</script>

Npm doesn't know to run index.js unless it's in package.json, so I added
<span class="code">"start-dev": "node index.js"</span> under scripts to package.json:

{% include img.html src="../pics/package-start-script.png" %}

Now running <span class="code">npm run start-dev</span> ran
index.js using node. Then while the command is running, when visiting
<span class="code">localhost:5000/greet</span> in a browser the Express app
responds by sending the browser "hi".

We could be finished with the Express portion, but it's annoying to have to re-run
the program when we want to change index.js.

So I installed nodemon, which restarts a command whenever it notices a file change:

<div class="code">npm install nodemon --save-dev
</div>

Note that I use the <span class="code">\-\-save-dev</span> flag. This adds
nodemon as a dependency only necessary during development. When I deploy UrlMem to
the public, I won't need to use nodemon.

In order to put nodemon into practice, I changed the
<span class="code">start-dev</span> script in
<span class="code">package.json</span> to the following:

<div class="code">nodemon index.js -i client node_modules</div>

{% include img.html src="../pics/package-start-script2.png" %}

I told nodemon to ignore folders <span class="code">node_modules</span> and
<span class="code">client</span>, as they don't require restarting the server.

To see that nodemon was working, I changed the greeting in
<span class="code">index.js</span> to "hello" and saved it. When I reloaded 
<span class="code">localhost:5000/greet</span> I saw the server had updated
without me restarting it, so I changed the greeting back to "hi".

## Why React

In essence, React is a component-oriented library. Normally HTML is pretty much
hard coded - the layout is written, and that's how it stays.

With React, pieces of HTML are created as components. This makes reusing HTML
much easier.

Additionally, React is often paired with JSX, which lets us to use HTML in
javascript files, without the HTML needing to be hard coded in strings.

## Creating the React App

First I installed <span class="code">create-react-app</span> and used it to
generate a basic react app in the <span class="code">urlmem-app</span> folder.

<div class="code">npm install -g create-react-app
create-react-app client
</div>

Note that I didn't use the <span class="code">\-\-save</span> flag to make
<span class="code">create-react-app</span> a dependency, since after generating
the react app, I'd no longer need the tool in the project. Instead I used the
<span class="code">-g</span> flag to install the tool globally, so that I can use
it for projects later outside of the <span class="code">urlmem-app</span>
directory.  

Now when I ran <span class="code">npm start</span> from within the react
project, the app started up in a browser window at port 3000.

<div class="code">cd client
npm start
</div>

{% include img.html src="../pics/example-react.png" %}

Although the example React app is quite nice, it's not a URL shortener. So I
went into the <span class="code">src</span> folder, and removed all of the code
from <span class="code">index.css</span> and <span class="code">App.css</span>.

Next I deleted <span class="code">logo.svg</span>, and in
<span class="code">App.js</span> removed the import for
<span class="code">logo.svg</span>.

The last removal was of the <span class="code">.git</span> folder from client, as
it's only for keeping the basic react app up to date, and I'd be making changes of
my own.

<div class="code">cd ..
rm -rf .git
</div>

Afterwards I made some edits to App.js, which is the main file for a React
project:

<script src="https://gist.github.com/J3698/81847f75bb68af1f9264dc10e10a1347.js">
</script>

Note that before, App was just a function. Now it's a class extending
<span class="code">Component</span>. Components can be written both ways - learn
more about components by reading
[the react docs](https://reactjs.org/docs/hello-world.html).

Now, provided the Express app is running in a different terminal, App tries to
get data from the Express app's /greet route, and tells us if it's successful
(it wasn't):

{% include img.html src="../pics/no-data.png" %}

## Integrating Express and React

The React app couldn't successfully connect to the Express server because React is
running on port 3000, and Express on port 5000. So the React app ends up receiving
junk from it's own server, not from the Express server.

The solution is to tell React to use a proxy in
<span class="code">client/package.json</span>:

<div class="code">"proxy": "http://localhost:5000"
</div>
{% include img.html src="../pics/package-proxy.png" %}

Now after restarting the React app, Express could talk to React:
{% include img.html src="../pics/some-data.png" %}

## Finishing Touch

At this point I was having to run <span class="code">npm run start-dev</span> in
the <span class="code">urlmem-app</span> folder, and in another terminal run the
same command in the <span class="code">urlmem-app/client</span> folder.

To fix this I installed concurrently, a cross-platform solution for running two
commands at the same time. It should be installed in
<span class="code">urlmem-app</span>, not in <span class="code">client</span>:

<div class="code">npm install concurrently --save-dev
</div>

Then I changed the start-dev script in
<span class="code">urlmem-app/package.json</span> to run both the React app and
the Express app:

<div class="code"> "start-dev":                                                                
  "concurrently \"nodemon index.js -i client node_modules\" \"npm --prefix ./client start\""
</div>

{% include img.html src="../pics/script-conc.png" %}

Now running <span class="code">npm run start-dev</span> from within the
<span class="code">urlmem-app</span> folder ran the express and react app,
updating the appropriate app when files changed.

I've already started on the different components for the website, so stay tuned
for the next post, where I'll design the urlmem website.

## Sources

[React Website](https://reactjs.org/)

[How to get "create-react-app" to work with your API](https://www.fullstackreact.com/articles/using-create-react-app-with-a-server/)

[Setting up a Node.js Express server for React](https://medium.com/@maison.moa/setting-up-an-express-backend-server-for-create-react-app-bc7620b20a61)
