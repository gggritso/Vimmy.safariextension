# [Abandoned] Vimmy - Neato Vim-ness for Safari

## Project Status

Ever since Mojave Apple has been making it harder and harder and more annoying to develop Safari extensions to the point where I just don't feel like doing it anymore. The process is now more obscure, the documentation is lacking, and the upgrade path is unclear.

If you're an application developer and you want to take this project over, by all means, go ahead and fork it! The license is fully permissive. You can re-distribute this as your own, and even charge for it if you wish. Good luck to you, if you do!

## Installation

The best way to get the latest version is to [download the release file](https://github.com/gggritso/Vimmy.safariextension/releases/latest) from GitHub. The extension is available on the [Safari Extensions Gallery](https://safari-extensions.apple.com/details/?id=com.gggritso.vimmy-36948PQEY6) but they haven't been responding to my requests for an update, so the version there is stale.

## Commands
- `hjkl` to scroll left/down/up/right
- `gg` and `shift+g` to scroll to top/bottom
- `f` to click on elements like links, inputs, buttons
- `shift-f` to open links in a new background tab
- `esc` and `ctrl+[` to break out of link mode
- `shift-h` to go back in history
- `shift-l` to go forward in history
- `gt` and `shift-k` to go to the next tab
- `gT` and `shift-j` to go the the previous tab
- `x` to close the current tab
- `t` to open a new tab
- `r` to reload the current tab
- `ctrl-d` to scroll down by half a page
- `ctrl-u` to scroll up by half a page
- `ctrl-f` to scroll down by a full page
- `ctrl-b` to scroll up by a full page


## Settings

If you use websites that have their own shortcuts, you can add them to the extension blacklist (available since version `0.4.0`). In extension settings, just add a list of domains where you want the extension to be ignored. Each line can be a regular expression. Please separate the values using commas. For example, yours might look something like this:

```
google.com,facebook.com,tumblr.com/.*
```

Unfortunately Safari is quite limited in what kinds of settings can be added at the moment, so I couldn't add a proper list input. Maybe one day!

It's also possible to add a global hard-coded website blacklist. If you have thoughts or suggestions for this, please check out the [Github repo](https://github.com/gggritso/Vimmy.safariextension/issues).

If the slightly-rotated hints are a distraction for you, there is also an option to turn that off.

If the black-and-white hints aren't your cup of tea, you're welcome to try high-contrast mode which changes the background to yellow.

## Why

There are other Vim extensions for Safari, but this one is mine!

- better hints (high contrast, chevrons show associated link)
- fluid scrolling animations
- minimum useful command set
