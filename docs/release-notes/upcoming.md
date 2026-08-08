# Release notes — upcoming

## Opening an argument you have not reviewed yet no longer fails

The server answers "you have no review of this argument yet" with a specific,
deliberate reply. The shared client did not recognise it and treated it as a
broken response, so on the mobile app the review screen never finished loading
and every control stayed inert — a signed-in reader could not start their first
review at all. It is now understood for what it is: an ordinary empty state,
handed back to the app as "no review yet" so it can offer to start one.

Two more replies of the same kind were being treated the same way and are now
recognised too: "you already have a review of this argument", which happens
with a second tab open or after a retry, and "your monthly token budget is
exhausted", which the import and build screens can hit. Neither could report
itself properly before; the first meant an existing review was silently not
picked up, the second meant a budget message could not be shown.
