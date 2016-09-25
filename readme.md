# Vimmy - Neato Vim-ness for Safari

## Commands
- `hjkl` to scroll left/down/up/right
- `gg` and `shift+g` to scroll to top/bottom
- `f` to click on elements like links, inputs, buttons
- `shift-f` to open links in a new background tab
- `esc` and `ctrl+[` to break out of link mode

## Settings

If you use websites that have their own shortcuts, you can add them to the extension blacklist (available since version `0.4.0`). In extension settings, just add a list of domains where you want the extension to be ignored. Each line can be a regular expression. Please separate the values using commas. For example, yours might look something like this:

```
google.com,facebook.com,tumblr.com/.*
```

Unfortunately Safari is quite limited in what kinds of settings can be added at the moment, so I couldn't add a proper list input. Maybe one day!

It's also possible to add a global hard-coded website blacklist. If you have thoughts or suggestions for this, please check out the [Github repo](https://github.com/gggritso/Vimmy.safariextension/issues).

## Why

There are other Vim extensions for Safari, but this one is mine!

- better hints (high contrast, chevrons show associated link)
- fluid scrolling animations
- minimum useful command set
