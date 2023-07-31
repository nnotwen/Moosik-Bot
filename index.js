require("dotenv").config();

const {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const { Player, QueryType, QueueRepeatMode } = require("discord-player");
const { prefix, help } = require("./constants.js");

// Create client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Create player
client.player = new Player(client, {
  deafenOnJoin: true,
  lagMonitor: 1000,
  ytdlOptions: {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

// Register extractors
client.player.extractors
  .loadDefault()
  .then(() => console.log("Extractors are loaded!"));

// Player Events
client.player.events
  .on("error", (q, err) => console.log(`[${q.guild.name}] ${err.message}`))
  .on("debug", (_, msg) => console.log(`[DEBUG] ${msg}`))
  .on("playerStart", (queue, track) => {
    queue.metadata.channel.send(`Started playing **${track}**`);
  });

client.once(Events.ClientReady, (c) => {
  // Inform that the client is ready
  console.log(`${c.user.tag} is ready!`);
});

// Triggers when a message is sent
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bot
  if (message.author.bot) return;
  // Ignore messages not coming from guild
  if (!message.guild) return;
  // Ignore messages that is not command
  if (!message.content.startsWith(prefix.toLowerCase())) return;

  // Get the command name
  const [command, ...args] = message.content
    .substring(prefix.length)
    .split(/ +/);

  // Ping
  if (command.toLowerCase() === "ping") {
    return message.reply(`Ping: ${client.ws.ping}ms`);
  }

  // Help
  if (command.toLowerCase() === "help") {
    const fields = Object.entries(help).map(([k, v]) => ({
      name: k,
      value: v,
      inline: true,
    }));

    const embed = new EmbedBuilder()
      .setTitle("Command list")
      .setDescription("Prefix is `m!`")
      .addFields(fields);
    return message.reply({ embeds: [embed] });
  }

  // Play command
  if (command.toLowerCase() === "play") {
    if (!args.join(" "))
      return message.reply("❌ Search or URL query is required");
    const result = await message.client.player.search(args.join(" "), {
      requestedBy: message.author,
      searchEngine: QueryType.AUTO,
    });

    if (!result.hasTracks()) return message.channel.send("❌ No results");

    const resource = await message.client.player.play(
      message.member.voice?.channelId,
      result,
      {
        nodeOptions: {
          metadata: {
            channel: message.channel,
            client: message.guild.members.me,
            requestedBy: message.author.username,
          },
          volume: 20,
          bufferingTimeout: 3000,
          leaveOnEnd: false,
        },
      }
    );

    const isPlaylist = resource.track.playlist;

    const trackURL = isPlaylist
      ? resource.track.playlist.url
      : resource.track.url;

    const trackTitle = isPlaylist
      ? `Multiple tracks from [**${resource.track.playlist.title}**](<${trackURL}>)`
      : `[**${resource.track.title}**](<${trackURL}>)`;

    return message.channel.send(
      `${trackTitle} was successfully added to queue`
    );
  }

  // Following commands rely on the existence of queue
  const queue = message.client.player.nodes.get(message.guild);
  if (!queue) return message.reply("❌ There is nothing on the queue");

  // List queue
  if (command.toLowerCase() === "queue") {
    const list = queue.tracks
      .map((track, index) => `${index + 1}. ${formatTrack(track)}`)
      .join("\n");
    return message.reply(list || "❌ There are no tracks in the queue");
  }

  // Play previous track
  if (command.toLowerCase() === "previous") {
    const track = queue.history.previousTrack;
    await queue.history.previous();
    return message.reply(`Playing previous song: ${formatTrack(track)}`);
  }

  // Clear Queue
  if (command.toLowerCase() === "clear") {
    await queue.tracks.clear().catch((e) => e);
    return message.reply("Successfully cleared the queue!");
  }

  // Jump
  if (command.toLowerCase() === "jump") {
    const trackNum = parseInt(args[0]);
    if (isNaN(trackNum)) return message.reply("❌ Invalid integer");

    const track = queue.node.jump(trackNum - 1);
    if (track) {
      return message.reply(`Successfully jumped to ${formatTrack(track)}!`);
    } else {
      return message.reply("❌ Unable to jump to the selected track!");
    }
  }

  // Remove
  if (command.toLowerCase() === "remove") {
    const trackNum = parseInt(args[0]);
    if (isNaN(trackNum)) return message.reply("❌ Invalid integer");

    const track = queue.node.remove(trackNum - 1);
    if (track) {
      return message.reply(`Successfully removed ${formatTrack(track)}`);
    } else {
      return message.reply("❌ Unable to remove selected track!");
    }
  }

  // Following commands rely on the fact that the queue state is on playing
  if (!queue.isPlaying())
    return message.reply("❌ Nothing is currently playing");

  // Loop
  if (command.toLowerCase() === "loop") {
    const mode = (args[0] || "").toLowerCase();
    if (!["off", "track", "queue", "autoplay"].includes(mode))
      return message.reply(
        "❌ Must provide one of the following mode: [off, track, queue, autoplay]"
      );

    queue.setRepeatMode(QueueRepeatMode[mode.toUpperCase()]);
    return message.reply(
      `Successfully set repeat/loop mode to: **${mode.toUpperCase()}**`
    );
  }

  //  Now Playing
  if (command.toLowerCase() === "nowplaying") {
    const progress = queue.node.createProgressBar();
    const track = queue.currentTrack;

    return message.reply(
      `Currently Playing: ${formatTrack(track)}\n${progress}`
    );
  }

  // Pause
  if (command.toLowerCase() === "pause") {
    queue.node.setPaused(true);
    return message.reply("Successfully paused the music");
  }

  // Resume
  if (command.toLowerCase() === "resume") {
    queue.node.setPaused(false);
    return message.reply("Successfully resumed the music");
  }

  // Skip
  if (command.toLowerCase() === "skip") {
    queue.node.skip();
    return message.reply("Skipping the current music...");
  }

  // Shuffle
  if (command.toLowerCase() === "shuffle") {
    queue.tracks.shuffle();
    return message.reply("Successfully shuffled the queue");
  }

  // Stop
  if (command.toLowerCase() === "stop") {
    message.client.player.nodes.delete(message.guild.id);
    return message.reply("Stopped the music");
  }
});

client.login(process.env.TOKEN);

function formatTrack(track) {
  return `[**${track.title}**](<${track.url}>)`;
}
