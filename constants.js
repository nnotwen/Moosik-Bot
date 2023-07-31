exports.prefix = "m!";

exports.regExp = {
  youtube:
    /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
};

exports.help = {
  clear: "Clears the queue",
  help: "Displays the commands for this bot",
  "jump <track num>": "Jump to a specific track",
  loop: "Set the loop mode for the queue",
  nowplaying: "Display the title of the current audio playing",
  pause: "Pause the music",
  play: "Play the music",
  previous: "Replay the previous track",
  "remove <track num>": "Remove specific track",
  queue: "Displays the queue",
  resume: "Resumes paused music",
  shuffle: "Shuffles the queue",
  skip: "Skips the current music",
  stop: "Stop the player",
};
