# builder.gg

### Live Demo

http://builder.gg

## Overview

builder.gg was created as an entry into Riot's Summer API Challenge.  It's intended to be a tool for garnering insights about item efficiency and impact on League of Legends games.  There are essentially two parts to builder.gg that synergize together: champion.builder.gg and item.builder.gg

On either site, the **help!** link in the top left corner can be clicked to bring up descriptive tooltips about what each element contains.

### champion.builder.gg

This application gives statistical data on item builds up-to-date with the current patch.  To achieve robust results, a large number of item builds must be analyzed (1,012,460 currently) and categorized for detailed querying by the frontend.  The categories used are: Champion, Tier, Patch, Role, Lane, and Outcome (Victory/Defeat).  By separating results in this way, the user is granted finer granularity in their query while the system retains the ability to generalize data if needed (e.g. combining data from all patches).  The application itself can be divided into 3 main parts:

* **Search Terms**: Here we have a few select boxes to allow the user to find the specific data they are after.  The available choices are searching by tier, champion, and optionally lane (with an option to default to the lane with the most samples).
* **KDA Chart**: This chart displays KDA ratio in specified intervals of the game for the current search terms.  Using this data, a user can discover generally how a champion performs at each stage of the game (e.g. Caitlyn tends to have a lower impact early game, and then rapidly increases past the 35 minute mark).  The sample size available at each minute interval is also displayed to give the user a general idea of how robust the data is.
* **Build Details**: In this section we can see what minute interval an item is present in greater than 50% of builds analyzed.  Again, sample size can be important so it is displayed again here underneath the minute header.  Along with sample size, a ΔKDA value is also displayed.  This value is calculated by simply taking the difference of the current minute interval's KDA and the last interval.  With this data, it can give some insight as to what items give large power spikes.  In the future, this ΔKDA value will be normalized against the mean ΔKDA for all champions, in order to give a more meaningful output value to the user.  The core build is populated with "final evolution" items (i.e. items that cannot be upgraded further), and a link for this build can be generated for deeper analysis in item.builder.gg

### item.builder.gg

This application provides a detailed breakdown for item sets, and tools to share and use the set in game.  Here you can create item sets from scratch, use a core build brought in from champion.builder.gg, or even load up an item set created in the League of Legends client.

* Upload Item Set: To load a League of Legends item set, simply click the *Upload Item Set* button, and browse to the item set JSON file (Usually C:\Riot Games\League of Legends\Config\Global\Recommended).  This will import the item set name along with all item blocks associated with this set.

* Share Item Set: This generates a shareable link so you can send this build to friends.  What happens behind the scenes is that the local item set object stored in memory is converted to a JSON string and sent off as a POST request to the *linkify* script.  This script first gets an MD5 hash for the object string and uses that as an identifier index.  If the MD5 string already exists in the database then we simply return the MD5 string back to the requester without inserting anything since it's already available in the database.  Otherwise, we save the JSON object string along with the MD5 hash as the unique ID.  When a user loads a link, the linkifier looks up the MD5 hash in the database and returns the associated JSON object so the frontend can populate the item set.

* Download Item Set: When this button is pressed, a custom item set is generated locally and downloaded to the user's computer.  This item set is created according to Riot's Item Set API, and will be loaded in game if placed in the correct directory (e.g. C:/Riot Games/League of Legends/Config/Global/Recommended)

## Technology Stack

#### API Processor
##### Framework
* NodeJS
* MongoDB

Since this project relies on a large amount of source data to process, a fast solution for caching match data had to be designed.  A few aspects were prioritized in when creating this system:
* Scalable to large amounts of data
* Fast database read/write times
* Favor recent matches
* Strive for equal ranked tier representation

NodeJS was chosen for its speed and quick setup time, along with its ability to package all dependencies nicely for others to replicate.

In order to satisfy the scalability and speed requirements, MongoDB was chosen since the queries would be fairly simple and scalability is very important (an environment where NoSQL solutions thrive).  Mongoose was chosen for its ODM (Object Data Mapper) capabilities to solidify collection schemas and allow for easy representation on the front end.

Now that the technologies were decided upon, some helper scripts were created to lay a foundation for the processor to perform its work:
* **add_seed_summoner**: This script is only required when starting the system from scratch.  Because of how the Riot API is set up, there is no endpoint that easily gives recent matches.  The only way to fetch the most recent matches is to retrieve a large number of summoner's match histories, and then use those match ID's to pull the match data.  By adding these "seed" summoner's to the database, we give the system a jumping off point which will allow it to branch out to other summoner's by fetching summoner ID's available in their history.  Initially, one summoner from each rank tier (7 total) was used.

* **summoner_discovery**: The summoner discovery tool iterates through the **SeedSummoners** we have available, and scrapes their ranked league to find other summoners to add locally.  This uses the *league-v2.5* endpoint, and saves information about rank, division, wins, and losses for the initial seed summoner along with all other summoner's in the tier.  Having a large local summoner database will help in finding recent matches.

* **add_match_queue**: Now that we have some summoner ID's, we can start fetching their match histories.  The match data returned from the *matchlist-v2.2* is minimal, but does contain match ID's and a timestamp.  Using this information, a *MatchQueueItem* is created for each match, so we can later look up the actual match data.  This *MatchQueueItem* contains the rank of the summoner whose history it came from, a timestamp, the queue (e.g. RANKED_SOLO_5x5), and of course the match ID.

* **cache_match_data**: In this script, the *MatchQueueItems* are sorted by their timestamp (to try and get the most recent matches), and a call is made to the API to fetch the current match ID.  Each tier is fetched sequentially, to try our best to keep every rank as equally represented as possible.  The full JSON response is saved as a *MatchCacheItem*, indexed by the match ID.  Once data has been retrieved, the *MatchQueueItem* is marked as cached so it doesn't try to cache the same match multiple times.  Before moving onto the next entry, the participating summoner's are scraped out, and marked for refresh by **add_match_queue** to hopefully find more recent matches.

* **item_build_processor**: This is where all of the statistical data is generated, this script runs through all available cached matches and saves relevant information about builds.  After selecting a match, timeline events are process for each champion, and a running inventory is kept that tracks the buying/selling/upgrading of items.  At specified intervals, the inventory is recorded as generated identifier which takes into account the item quantity along with the item ID and separated by semicolons.  To standardize the same same build but different slots, the items are also sorted by item ID.  For example, if a starting build contained 3 Health Potions and a Doran's Blade, the generated build identifier would be 11055:32003 = (1x)(DoransBladeID):(3x)(HealthPotionID).  By generating the identifier in this way, to retrieve the item quantity we simply divide by 10000 (only possible because all item ID's are 4 digits) and take the floor function.  If we are after the item's ID, we can do the modulus operator and 10000.  This generated identifier becomes the key in an object map, and the value is incremented by 1 to indicate this build was present.  By saving composite builds in this manor, theoretically this will allow for some more details analysis involving which items are often seen together, and which items cause a build divergence.

##### Packages
* Mongoose

#### Web Application
##### Framework (MEAN)
* MongoDB
* ExpressJS
* AngularJS
* NodeJS

##### Packages
* bower
* jQuery
* Bootstrap 3
* angular-ui-select
* Chart.js
* Chart.StackedBar.js
* angular-chart.js
* FontAwesome
* angular-bind-html-compile
* file-saver
* angular-popover-toggle

## Future Improvements
