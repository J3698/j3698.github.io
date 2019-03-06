---
layout: post
title: "Make Posting Easy: Upgrade to Jekyll"
date: 2018-08-29
edited: 2019-03-06
categories: website
thumb: /pics/thumb4.jpeg
---
		
If it takes 10 minutes to just set up a new blog post, something is probably wrong. Especially if much of that time includes copy-pasting formatting from another post. With that in mind, I recently upgraded my website to use Jekyll.

Jekyll is pretty simple - you write posts in plain text or using markdown, and then you use a theme or create layout files in html to surround that text. If you want, you can even write pure html in your markdown/plain text posts, although that can tend to defeat the purpose.

To get an idea of what using Jekyll is like, here is my directory structure right now, minus some less relevant files:

**_posts/** is where all of the posts go. Each post gets named in a particular way, and at the top of each post there are about 5 lines of setup (author, date, etc).

**_layouts/** is where html for the posts and other pages go. Each layout file has a place where content will be inserted.

**_includes/** is where common html goes. For example, I might make header.html in _includes, and then include that header in different layout files.

**_site/** is a staging area - I don't mess with anything there.

**pics/** is pretty self explanatory - I put pictures there.

**_config.yml** can become complicated - it lets me change how certain things are automated.

**longboard.html** is a landing page that lists my longboard posts.

**website.html** lists my website posts (like this post). 

**styles.css** contains all the styling I need.

**404.html** is where you'll end up if you visit a nonexistent post.

Last but certainly not least, I learned most of the jekyll I know from Mike Dane - he's crystal clear, and you'll find yourself doing things you may have thought weren't possible in Jekyll in no time:

<br/><br/>
<iframe width="560" height="315" src="https://www.youtube.com/embed/T1itpPvFWHI" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

{% include news.html %}
