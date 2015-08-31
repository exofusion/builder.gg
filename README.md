# builder.gg

## Overview

builder.gg was created in response to Riot's Summer API Challenge.  It's intended to be a tool for garnering insights about item efficiency and impact on League of Legends games.  There are essentially two parts to builder.gg that synergize together: champion.builder.gg and item.builder.gg

### champion.builder.gg

This application gives statistical data on item builds up-to-date with the current patch.  To achieve robust results, a large number of item builds must be analyzed (983,290 currently) and categorized for detailed querying by the frontend.  The categories used are: Champion, Tier, Patch, Role, Lane, and Outcome (Victory/Defeat).  By separating results in this way, the user is granted finer granularity in their query while the system retains the ability to generalize data if needed (e.g. combining data from all patches).  The application itself can be divided into 3 main parts:

* **KDA Chart**: This chart displays KDA ratio in specified intervals of the game for the current search terms.  Using this data, a user can discover generally how a champion performs at each stage of the game (e.g. Caitlyn tends to have a lower impact early game, and then rapidly increases past the 35 minute mark).  The sample size available at each minute interval is also displayed to give the user a general idea of how robust the data is.

### item.builder.gg

### Live Demo

http://builder.gg

## Technology Stack

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

#### API Processor
##### Framework
* NodeJS
* MongoDB

##### Packages
* Mongoose

## Backend API Processor

### Process Overview

## Frontend Web Application

## Future Improvements

### Web Application

### Backend API Processor
