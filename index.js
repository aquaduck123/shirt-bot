const fs = require('fs');
const axios = require("axios")
const Discord = require('discord.js');
const { Client, Intents, MessageEmbed} = require('discord.js');
const bot = new Client({ intents: 32767 });
const badWords = require("./JSONs/badWords.json")
const config = require("./config.json")

let shirttalk_channels = require("./JSONs/shirttalk.json")
var shirtinstruct_channels_ids = require("./JSONs/shirtinstruct.json")

let shirttalk_channel_ids = []
for (const channel of shirttalk_channels) {
  shirttalk_channel_ids.push(channel.id)
}
function subArr(arr, i) {
  let newArr = []
  for (var x = 0; x < i && x < arr.length; x++) {
    newArr[x] = arr[x]
  }
  return newArr
}


bot.on("messageCreate", async message => {

  if (shirttalk_channel_ids.includes(message.channel.id) && !message.author.bot) {
    for (const prefix of config.prefixes) {
      if (message.content.startsWith(prefix))
        message.content = message.content.replace(prefix, "--")
    }

    if (!message.content.startsWith("--") && !message.content.startsWith("#")) {
      if (message.system || !message.content) return
      message.channel.sendTyping()
      var temp = await collect_messages(message.channel)
      let messages = temp.messages
      let authors = subArr(temp.authors, 4)

      var prompt = ""
      for (const message of messages) {
        prompt += (message + "\n")
      }
      if (message.guild.me.nickname) {
        prompt += `${message.guild.me.nickname}:`
      } else {
        prompt += `${bot.user.username}:`
      }


      var randomness = shirttalk_channels.find(o => o.id === message.channel.id).randomness;
      getRequest(prompt, message, randomness, authors)


    }

  }

  if (!message.content.startsWith("--")) return

  if (message.content.startsWith("--shirttalk toggle")) {
    if (shirttalk_channel_ids.includes(message.channel.id)) {
      shirttalk_channel_ids.splice(shirttalk_channel_ids.indexOf(message.channel.id))
      for (var x = 0; x < shirttalk_channels.length; x++) {
        if (shirttalk_channels[x].id == message.channel.id) {
          shirttalk_channels.splice(x)
          fs.writeFile("./JSONs/shirttalk.json", JSON.stringify(shirttalk_channels, null, 4), function(err) {
            if (err) return console.log(err);
          });
          return
        }
      }

    } else {
      let randomness = message.content.split(" ")
      if (randomness.length > 2) {
        randomness = parseFloat(randomness[2])
        if (!isNaN(randomness)) {
          if (randomness <= 50 && randomness >= 0) {
            // RANDOMNESS IS VALID :D
          }
          else randomness = 40
        }
        else randomness = 40
      }
      else randomness = 40
      shirttalk_channel_ids.push(message.channel.id)
      shirttalk_channels.push({
        id: message.channel.id,
        randomness: randomness
      })


      fs.writeFile("./JSONs/shirttalk.json", JSON.stringify(shirttalk_channels, null, 4), function(err) {
        if (err) return console.log(err);
      });

    }
  } else if (message.content.startsWith("--shirtinstruct toggle")) {

    if (shirtinstruct_channels_ids.includes(message.channel.id)) {
      shirtinstruct_channels_ids.splice(shirtinstruct_channels_ids.indexOf(message.channel.id))


      fs.writeFile("./JSONs/shirtinstruct.json", JSON.stringify(shirtinstruct_channels_ids), function(err) {
        if (err) return console.log(err);
      });




    } else {
      shirtinstruct_channels_ids.push(message.channel.id)

      fs.writeFile("./JSONs/shirtinstruct.json", JSON.stringify(shirtinstruct_channels_ids), function(err) {
        if (err) return console.log(err);
      });

    }



  } else if (message.content.startsWith("--help")) {
    const embed = new MessageEmbed()
      .setTitle("shirt bot help")
      .setDescription("This is a modified version of Cyclcrclicly's shirt bot which can be found at https://github.com/Cyclcrclicly/shirt-bot. This bot uses OpenAI's GPT-3 models to generate responses to a message or collection of messages. \n Commands are listed below")
      .setFields([
        { name: "--help", value: "Displays this menu" },
        { name: "--instruct", value: "uses OpenAI's instruct beta to try and complete a prompt" },
        { name: "--shirttalk toggle", value: "toggles shirttalk in that channel" },
        { name: "--shirtinstruct toggle", value: "toggles shirtinstruct in that channel" }
      ])
      .setFooter("Made by AquaDuck#5358")
      .setTimestamp()
    message.reply({ embeds: [embed] })

  } else if (message.content.startsWith("--generate")) {
    message.channel.sendTyping()
    var messages = await collect_messages(message.channel)

    messages = messages.messages
    var prompt = ""
    for (const message of messages) {
      prompt += (message + "\n")
    }
    prompt += `${message.guild.me.nickname}:`

    var randomness = 0.7;
    getRequest(prompt, message, randomness)
  }

})

async function collect_messages(channel) {
  let authorNames = []
  var lst = []
  var authors = []
  var messages = await channel.messages.fetch({ limit: 10 })
  var contents = []
  messages = Array.from(messages.values())

  for (const message of messages) {

    contents.push(message.content.toLowerCase())

    if (!authorNames.includes(message.author.id)) {
      try {

        authorNames.push(message.author.id)
        if (message.member.nickname != null) {
          authors.push(message.member.nickname + ": ")
        } else {

          authors.push(message.author.username + ": ")
        }
      } catch (err) { console.error(err) }
    }
  }
  startPos = messages.length;
  for (const prefix of config.prefixes) {
    for (var x = 0; x < contents.length; x++) {
      if (contents[x].startsWith(prefix)) {
        contents[x] = contents[x].replace(prefix, "--")

      }

    }

  }
  if (contents.includes("--reset")) {
    var x = 0;
    while (startPos == messages.length && x < messages.length) {
      if (messages[x].content.startsWith("--reset")) {
        startPos = x
        x = messages.length + 1
      }
      else
        x++
    }
  }

  for (var x = 0; x < startPos; x++) {

    var message = messages[x]
    var collected = true
    for (const prefix of config.prefixes) {
      if (message.content.startsWith(prefix)) {
        collected = false
      }
    }
    if (message.content.startsWith("#") || message.content.startsWith("&")) collected = false

    if (collected) {
      if (message.member.nickname != null) {

        lst.push(`${message.member.nickname}: ${message.content}`)
      } else {

        lst.push(`${message.author.username}: ${message.content}`)
      }
    }
    else if (x == messages.length - 1 && !config.prefixes.includes(message.content.substring(0, 2)))
      lst.push(message.guild.me.nickname + ": ")
  }

  lst.reverse()
  return { messages: lst, authors: authors };

}


async function getRequest(prompt, message, randomness, authors) {

  var data = await axios
    .post(`https://api.openai.com/v1/engines/${config.engine}/completions`,
      {
        prompt: prompt,
        temperature: randomness / 50,
        max_tokens: config.max_tokens,
        top_p: 1,
        frequency_penalty: config.frequency_penalty,
        presence_penalty: 0,
        stop: authors
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config["OPENAI_TOKEN"]}`,
        }
      })
  data = data.data

  try {
    if (data.error) {
      fs.writeFile("./err.txt", JSON.stringify(data.error, null, 4), function(err) {
        if (err) return console.log(err);
      });
      process.exit(1)
    }
    if (!data.choices[0].text) return

    var response = remove_slurs(data.choices[0].text)
    if (response.includes("\n")) {
      response = response.split("\n")[0]
    }
    if (response.length <= 1) return
    message.reply(response)

  }
  catch (error) {
    console.error(error)
  }
}


function boldString(str, find) {
  var reg = new RegExp('(' + find + ')', 'gi');
  return str.replace(reg, '[slur removed]');
}

function remove_slurs(input) {
  for (const word of badWords) {
    while (input.toLowerCase().includes(word)) {
      input = boldString(input, word)
    }
  }
  return input
}

bot.on('ready', async () => {
  console.log(`Bot ready as ${bot.user.tag}`)
  module.exports.bot = bot
  require("./instruct")
})
bot.on('disconnect', function(msg, code) {
  console.log(msg + "\n" + code)
  if (code === 0) return console.error(msg);
  bot.connect();
});
bot.login(config["BOT_TOKEN"])