# Vimmy - Vim-ness for Safari

## Quickstart
- `hjkl` to scroll left/down/up/right
- `gg` and `shift+g` to scroll to top/bottom
- `f` to follow a link with its default action
- `esc` and `ctrl+[` to break out of link mode

## Specific Benefits
There are a few reasons why I wrote my own extension rathen than using one of the existing ones
- smarter hinting (higher contrast, explicitly points to the item, hints are kept in place after navigation)
- scrolling animations make motion more fluid
- doesn't override or add common actions (⌘+T, ^+tab, ⌘+W, etc.)
- turns off hjkl scrolling for websites I know that implement their own (Facebook, Twitter, etc.)
- hosted on GitHub so I can push updates, not to mention track issues and fix them
- flexible and easy to maintain to I can add shortcuts easily later if I so desire

## Bugs
There are a few websites where the hint CSS becomes broken. I'm on the lookout for these and I fix them as I see them. The same goes for websites with their own hjkl bindings.

## Learnings
For posterity, here are various neat things I learned while developing this:
- setting a <div> to contenteditable="true" to make it an input is actually a thing that people do
- you can detect whether a website is in an iframe with if ( top === self )
- setting keyhandlers for modifiers like ⌘ works _very_ differently across browsers
- there's no reliable way to open links in a new tab with javascript
- CSS specificity is hard
- you can start YouTube videos on demand by appending "&autoplay=true" to the iframe src
