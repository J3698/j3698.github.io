---
layout: post
title: "Persistence: Saving Shortenings to a Database"
date: 2020-05-25
categories: urlmem
thumb: /pics/thumb24.png
---

In my last post I deployed <a href="https://UrlMem.com">UrlMem</a> - but there
was one problem - if I stopped the server, all URL shortenings would disappear.
So in this post I'm adding a database to fix that.

As per the expert advice of
<a href="http://www.shalinidrao.com/">Shalini Rao</a> I'm using PostgreSQL, as
it's relatively simple, and UrlMem only has to store long and shortened URLs.

{% include img.html src="../pics/tabs.png" %}
*Only a few tabs are necessary to learn this simple database system.*

## Using PostgreSQL Locally

The first order of business was to install PostgreSQL locally for testing. They
have installation instructions
<a href="https://www.postgresql.org/download/">here</a>.

The next step was to figure out how to use PostgreSQL. On Ubuntu I have to
prefix commands with <span class="code">sudo -u postgres</span> to run them as
the postgres user, but on Windows or Mac this likely isn't the case.

First I verified that I could create databases using:
<div class="code">sudo -u postgres createdb urlmem</div>

Then I ran psql with <span class="code">sudo -u postgres psql</span> to open
Postgres' command-line front-end. Next I ran <span class="code">\list</span> to
show the available databses:

{% include img.html src="../pics/list_dbs.png" %}

The <span class="code">postgres</span> database is a default database that can
be used or deleted. The <span class="code">template1</span> is the database that
gets copied when we create a new database, and can be customized. The
<span class="code">template0</span> can also be used for new databases, but
isn't meant to be customized.

And then there's <span class="code">urlmem</span>, the recently created
database.

## Creating the Table

Note that when I ran <span class="code">psql</span> I didn't specify a database,
so by default I was connected to the <span class="code">postgres</span>
database.

I switched to the urlmem database via <span class="code">\connect urlmem</span>.

Then I created a table with this command:

<div class="code">CREATE TABLE shortenings (
    shorturl TEXT PRIMARY KEY,
    longurl TEXT NOT NULL,
    israndom BOOLEAN NOT NULL
);</div>

This represents a table of the following form:

{% include img.html src="../pics/table_format2.png" %}

The shorturl and longurl fields are self explanatory - the israndom field tells
us whether the shorturl was generated randomly or not.

The <span class="code">PRIMARY KEY</span> bit enforces that the shorturl field
should be non null and unique to each row. The longurl and israndom field
are also made to be non null.

Next I added a partial index on the table:

<div class="code">CREATE UNIQUE INDEX random_shortening_constraint
        ON shortenings(longurl, israndom)
        WHERE israndom;</div>

This forces the combination of longurl and israndom to be unique, but only where
israndom is true. In other words, we don't want to generate different random
URLs for the same long URL.

To speed things up, I also created an index on the longurl:

<div class="code">CREATE INDEX long_idx ON shortenings(longurl);</div>

Indexing allows items to be retrieved quickly - this might involve using a tree
structure. Since the shorturl is the primary key, it's automatically indexed.


There's a lot more nuance to maintaining indices and improving database
performance, but I don't expect performance to be an issue, so I left that
alone.

To verify the table properties, I ran <span class="code">\d shortenings</span>:
{% include img.html src="../pics/display_shortenings.png" %}

## Creating a New User

The next step was to add a new user, as the default user I'd been using,
"postgres", is the superuser.

While still in psql, I ran the following commands to create the user "me" with
password "password":

<div class="code">CREATE ROLE me WITH ROLE LOGIN PASSWORD 'password';</div>

Note the single quotes - sql uses these for strings.

Next I gave the user search and insert permissions:
<div class="code">GRANT SELECT, INSERT ON TABLE shortenings TO me;</div>

I closed psql, and then logged into psql using that user:
<div class="code">psql -U me -d urlmem</div>

Note that before doing so, I had to change the following line in
<span class="code">/etc/postgresql/12/main/pg_hba.conf</span>:
<div class="code">local   all             all                                     md5</div>
to the following:
<div class="code">local   all             all                                     peer</div>

This is because with the peer setting, psql uses the terminal user's username to
authenticate, instead of asking for a password. This might not apply to all
installations.

The last step to the setup was to test the granted permissions by inserting some
values into the table, and then displaying the table:

<div style="margin-bottom: 10px" class="code">INSERT INTO shortenings (shorturl, longurl, israndom)
        VALUES ('google', 'https://www.google.com', FALSE);</div>
<div class="code">SELECT * FROM shortenings;</div>

## Setting up PostgreSQL for Node

To setup Postgre for node, I ran
<span class="code">npm install \-\-save pg</span> from the project directory.
For the then I created a new file <span class="code">queries.js</span>.

Here is what the setup in <span class="code">queries.js</span> looks like:
<script src="https://gist.github.com/J3698/b932f455d5086a575d238e00f7c2faf5.js">
</script>

Another way to set things up is to use Client instead of Pool. Pool sets up a
group of clients. That way, multiple queries to the database can execute in
parallel using different client instances.

## Sending Queries in Node

In <span class="code">queries.js</span> I have four functions -
<span class="code">isShortUrlUsed</span>, <span class="code">getLongUrl</span>,
<span class="code">getRandomShortening</span>, and
<span class="code">addShortening</span>. Here I'll explain
<span class="code">addShortening</span>, as it's the most interesting one:
<script src="https://gist.github.com/J3698/e47d7e0ec83b01012e3ca8448daf98dc.js">
</script>

This function tries to add a shortening, but returns null if there is a
uniqueness constraint error. The first constraint, 'shortenings_pkey', is for
trying to use a shorturl twice, and the second is for adding two random
shortenings for one long URL.

The other interesting code in this function is the use of
<span class="code">async</span> and <span class="code">await</span>.

In javascript often we have functions that return immediately, but dont complete
their tasks immediately - such as setting a timer:
<div class="code">setTimeout(sayHi, 100);
console.log("Hello"); // this will run before sayHi
</div>

These functions are considered asynchronous. Database queries are also
considered asynchronous. If we want to do something after a database query
completes, we have to use the <span class="code">.then(function)</span> syntax:

<div class="code">// this will work
pool.query(query).then(sayCompleted);

// dis is not da wae
pool.query(query)
sayCompleted();
</div>

Having a bunch of <span class="code">.then()</span>s can become messy - which is
where async functions come into play. By marking a function as async, it becomes
asynchronous - but we're also able to use <span class="code">await</span> inside
of it.

The <span class="code">await</span> keyword simply waits for an asynchronous
function to finish before continuing, removing the need to chain a bunch of
calls to <span class="code">.then()</span>.

You can find my code up to this point
[here](https://github.com/J3698/urlmem/tree/master/urlmem-app), with some minor
differences.

## Moving things to Heroku

The next step was setting up PostgreSQL on Heroku. Heroku has instructions for
doing so
[here](https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js).

After setting up a databse, I ran <span class="code">heroku pg:psql</span> and
then created the table/indices from earlier.

One small change I had to make was to pooling - it isn't supported for free
users of Heroku so I switched to using Client, which is documented
[here](https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js).

But aside from that, things worked as well as they had locally.

## What's Next

Last post, I talked about potentially filtering for bad words. Recently, I've
also had the idea of making a UrlMem extension, so that people can right click
a link, and get a shortened version from there. Another idea is to let people
create user accounts, so that people can create shortenings without conflict.

Out of these ideas, I think I'll probably make an extension - but after that, I
might be done - I'm pretty happy with UrlMem as it stands.

Until next time!

## Sources

<div style="font-size: .8em">
    <a href="https://stackoverflow.com/questions/16973018/createuser-could-not-connect-to-database-postgres-fatal-role-tom-does-not-e#">Could not connect to database: Role does not exist</a>
    <br>
    <a href="https://help.ubuntu.com/community/PostgreSQL">PostgreSQL on Ubuntu</a>
    <br>
    <a href="https://www.postgresql.org/docs/12">PostgreSQL 12.3 Documentation</a>
    <br>
    <a href="https://chartio.com/resources/tutorials/how-to-list-databases-and-tables-in-postgresql-using-psql/">How to List Databases and Tables in PostgreSQL Using PSQL</a>
    <br>
    <a href="https://www.postgresqltutorial.com/postgresql-char-varchar-text/">PostgreSQL CHAR VARCHAR TEXT</a>
    <br>
    <a href="https://stackoverflow.com/questions/3949876/how-to-switch-databases-in-psql">How to Switch Databses in PSQL</a>
    <br>
    <a href="https://dba.stackexchange.com/questions/58312/how-to-get-the-name-of-the-current-database-from-within-postgresql">How to Get the Name of the Current Database from within PostgreSQL</a>
    <br>
    <a href="https://stackoverflow.com/questions/769683/show-tables-in-postgresql">Show Tables in PostgreSQL</a>
    <br>
    <a href="https://stackoverflow.com/questions/18664074/getting-error-peer-authentication-failed-for-user-postgres-when-trying-to-ge">Peer Authentication Failed Postgres</a>
    <br>
    <a href="https://www.postgresqltutorial.com/postgresql-describe-table/">PostgreSQL Describe Table</a>
    <br>
    <a href="https://www.postgresqltutorial.com/postgresql-insert/">PostgreSQL insert</a>
    <br>
    <a href="https://tableplus.com/blog/2018/04/postgresql-how-to-grant-access-to-users.html">PostgreSQL How to Grant Access to Users</a>
    <br>
    <a href="https://www.postgresqltutorial.com/postgresql-unique-constraint/">PostgreSQL Unique Constraint</a>
    <br>
    <a href="https://www.postgresqltutorial.com/postgresql-boolean/">PostgreSQL Boolean</a>
    <br>
    <a href="https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js">Heroku PostgreSQL</a>
    <br>
    <a href="https://www.w3schools.com/nodejs/met_assert.asp">Node assert</a>
    <br>
    <a href="https://medium.com/javascript-in-plain-english/async-await-javascript-5038668ec6eb">Async Await Javascript</a>
    <br>
    <a href="https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await">Async Await</a>
    <br>
    <a href="https://blog.logrocket.com/setting-up-a-restful-api-with-node-js-and-postgresql-d96d6fc892d8/">Setting up a Restful API with NodeJs and PostgreSQL</a>
    <br>
    <a href="https://node-postgres.com/">Node Postgres</a>
</div>
