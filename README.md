# @koddsson/coworking-with

Easily add coworking signatures to your commits.

## Usage

```sh
npx @koddsson/coworking-with <usernames>...
```

The script installs a `commit-msg` hook that will append all commit messages with `Co-authored-by: USERNAME <EMAIL>` for each user you have specified. This commit trailer can be picked up by tools such as [GitHub](https://help.github.com/en/articles/creating-a-commit-with-multiple-authors).

Note that since we go through the git log history to find the signature that the user you want to cowork with needs to have at least one commit into the repo you are working in.

Quit "coworking mode" with the `--stop` flag.

```sh
npx @koddsson/coworking-with --stop
```

That's pretty much it.

## Enhancements

I want a indicator in my shell to tell me if I'm coworking mode or not. I do this in my fish shell by checking the `coworking.coauthor` key in the git config.

```fish
function _is_coworking
  echo (command git config --get-all coworking.coauthor 2> /dev/null)
end

[..]

if [ (_is_coworking) ]
  set -l git_coworking "👨🏻‍💻"
  set git_info "$git_info$git_coworking"
end
```

This snippet just sets a little emoji on my prompt when I'm in coworking mode but your setup is going to need some different way to indicate coworking mode.
