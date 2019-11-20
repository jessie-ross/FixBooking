# FixBooking

A Chrome extension that fix's admin.booking.com's session
issues:

* Prevents invalidation of other tabs on login.
* Allows manually refreshing the session without logging you out.

It provides a small React/Redux interface injected into the page.


## How it works

This extension only deals with session fixing (for now).
It keeps the bare minimum in state.


### Foreground (content.js)

-   On load, detects the current session, notifies Background.
-   Waits for Background session changes, updates in new sessions.
-   Can also perform manual session changes, notifies Background.


### Background (background.js)

-   Remembers the last recieved session (the "freshest" session).
-   Informs any connected tabs of session changes.


# Running


## Developing

Run both of these:

    npx parcel watch src/js/content.js -d src/build/ -o content.js --hmr-hostname localhost
    npx parcel watch src/js/background.js -d src/build/ -o background.js --hmr-hostname localhost

Then in Chrome, go to chrome://extensions and click on Load Unpacked
Extension and select this folder.


## Building

Run:

    npm run build


# Copyright, Licensing and Warranty

Copyright © 2018 Jared Ross <jared.b.ross@gmail.com>
All Rights Reserved

Additionally this code is provided under the Mozilla Public License 2.0
For more information see LICENSE.txt

Use this code at your own risk.

