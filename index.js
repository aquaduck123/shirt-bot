const fs = require('fs');
const https = require("https")
const { send } = require('process');
const Discord = require('discord.js');
const { Client, Intents, Collection, MessageActionRow, MessageButton, MessageEmbed, MessageCollector, ButtonInteraction, MessageSelectMenu, MessageAttachment, ContextMenuInteraction } = require('discord.js');
const bot = new Client({ intents: 32767 });
const badWords = require("./JSONs/badWords.json")
const config = require("./config.json")

var shirttalk_channels = require("./JSONs/shirttalk.json")
require("./instruct")
var shirttalk_channel_ids = []
for (const channel of shirttalk_channels) {
  shirttalk_channel_ids.push(channel.id)
}


bot.on("messageCreate", async message => {
  if (shirttalk_channel_ids.includes(message.channel.id) && !message.author.bot) {
    if (!message.content.startsWith("--") && !message.content.startsWith("#")) {
      var temp = await collect_messages(message.channel)
      let messages = temp.messages
      let authors = temp.authors

      var prompt = ""
      for (const message of messages) {
        prompt += (message + "\n")
      }
      prompt += `${bot.user.username}:`
      var randomness = shirttalk_channels.find(o => o.id === message.channel.id).randomness;
      getRequest(prompt, message, randomness)
      
    }

  }
  for(const prefix of config.prefixes){
    if(message.content.startsWith(prefix))
    message.content = message.content.replace(prefix, "--")
  }
  if (!message.content.startsWith("--")) return

  if (message.content.startsWith("--shirttalk toggle")) {
    if (shirttalk_channel_ids.includes(message.channel.id)) {
      shirttalk_channel_ids.splice(shirttalk_channel_ids.indexOf(message.channel.id))
      for (var x = 0; x < shirttalk_channels.length; x++) {
        if (shirttalk_channels[x].id==message.channel.id) {
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
            
          }

        }
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
  }
})

async function collect_messages(channel) {

  var lst = []
  var authors = []
  var messages = await channel.messages.fetch({ limit: 15 })
  var contents = []
  messages = Array.from(messages.values())

  for (const message of messages) {

    contents.push(message.content.toLowerCase())
    
    if (!authors.includes(message.author.username)) authors.push(message.author.username)
  }
  startPos = messages.length;

  if (contents.includes("--reset")) {
    var x = 0;
    while (startPos == messages.length && x < messages.length) {
      if (messages[x].content.startsWith("--reset")) {
        startPos = x
        x = messages.length+1
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

    if (collected) lst.push(`${message.author.username}: ${message.content}`)
    else if (x == messages.length - 1 && !config.prefixes.includes(message.content.substring(0, 2)))
      lst.push(bot.username + ": ")
  }

  lst.reverse()
  return { messages: lst, authors: authors };

}


async function getRequest(prompt, message, randomness) {
  const data = JSON.stringify({
    prompt: prompt,
    temperature: randomness / 50,
    max_tokens: config.max_tokens,
    top_p: 1,
    frequency_penalty: config.frequency_penalty,
    presence_penalty: 0,
    stop: message.author.username + ": "
  })
  
  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: `/v1/engines/${config.engine}/completions`,
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config["OPENAI_KEY"]}`,
    }
  }
  const req = https.request(options, res => {
    var data = ""

    res.on('data', d => {
      data += d;
    })

    res.on("end", () => {
      data = JSON.parse(data)
      try {
        if(!data.choices[0].text) return
        var response = data.choices[0].text
        
        if (response.includes("shirt bot:")) console.log(message.content.split("shirt bot:"))
        
        message.reply(response)
      }
      catch (error) {
        console.error(error)
      }
    })
  })
  req.write(data)
  req.end()
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
})
bot.login(config["BOT_TOKEN"])