# Release notes — upcoming

## Registering no longer needs a code, and a code now buys a tier

The registration request no longer requires an invitation or promo code. Someone
can register in their own right, pick the username they want to be known by, and
a code — if they have one — sets the tier their account starts on instead of
being the price of entry.

Registration can also carry a bot-protection token from whichever challenge the
caller's platform runs; a platform that runs none simply omits it.

Nothing that worked before stops working: a request that sends a code and no
username is accepted exactly as it is today, and the response is unchanged. The
apps decide what they actually ask for at the point of registration; this
release only makes the wider request expressible.
