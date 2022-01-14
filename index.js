const fs = require('fs');
const https = require("https")
const Discord = require('discord.js');
const { Client, Intents, Collection, MessageActionRow, MessageButton, MessageEmbed, MessageCollector, ButtonInteraction, MessageSelectMenu, MessageAttachment, ContextMenuInteraction } = require('discord.js');
const bot = new Client({ intents: 32767 });
const badWords = require("./JSONs/badWords.json")
const config = require("./config.json")

var shirttalk_channels = require("./JSONs/shirttalk.json")
var shirtinstruct_channels_ids = require("./JSONs/shirtinstruct.json")

var shirttalk_channel_ids = []
for (const channel of shirttalk_channels) {
  shirttalk_channel_ids.push(channel.id)
}

bot.on("messageCreate", async message => {
   console.log()
   
  if (shirttalk_channel_ids.includes(message.channel.id) && !message.author.bot) {
    for (const prefix of config.prefixes) {
      if (message.content.startsWith(prefix))
        message.content = message.content.replace(prefix, "--")
    }

    if (!message.content.startsWith("--") && !message.content.startsWith("#")) {
      if (message.system || !message.content) return
      message.channel.sendTyping()
      var messages = await collect_messages(message.channel)
      

      var prompt = ""
      for (const message of messages) {
        prompt += (message + "\n")
      }
      prompt += `${message.guild.me.nickname}:`
      console.log(prompt)
      var randomness = shirttalk_channels.find(o => o.id === message.channel.id).randomness;
      getRequest(prompt, message, randomness)


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
      .setDescription("This is a modified version of Cyclcrclicly's shirt bot which can be found at https://github.com/Cyclcrclicly/shirt-bot. This bot is rewritten in Node JS with more features and customizability. This bot requires an OpenAI key which you can get from https://openai.com/api/")
      .setFields([
        { name: "--help", value: "Displays this menu" },
        { name: "--instruct", value: "uses OpenAI's instruct beta to try and complete a prompt" },
        { name: "--complete", value: "uses OpenAI's complete model to try and fill in a template" },
        { name: "--shirttalk toggle", value: "toggles shirttalk in that channel" },
        { name: "--shirtinstruct toggle", value: "toggles shirtinstruct in that channel" }
      ])
      .setFooter("Made by AquaDuck123#5358")
      .setTimestamp()
    message.reply({ embeds: [embed] })

  }else if (message.content.startsWith("--generate")){
    
  }

})

async function collect_messages(channel) {

  var lst = []

  var messages = await channel.messages.fetch({ limit: 15 })
  var contents = []
  messages = Array.from(messages.values())

  for (const message of messages) {

    contents.push(message.content.toLowerCase())


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
      if(message.member.nickname){
        
        lst.push(`${message.member.nickname}: ${message.content}`)
      }else{

        lst.push(`${message.author.username}: ${message.content}`)
      }
      }
    else if (x == messages.length - 1 && !config.prefixes.includes(message.content.substring(0, 2)))
      lst.push(message.guild.me.nickname + ": ")
  }

  lst.reverse()
  return lst

}


async function getRequest(prompt, message, randomness) {

  const data = JSON.stringify({
    prompt: prompt,
    temperature: randomness / 50,
    max_tokens: config.max_tokens,
    top_p: 1,
    frequency_penalty: config.frequency_penalty,
    presence_penalty: 0,
    stop: message.guild.me.nickname + ": "
  })

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: `/v1/engines/${config.engine}/completions`,
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config["OPENAI_TOKEN"]}`,
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
        if (!data.choices[0].text) return
        var response = data.choices[0].text

        // if (response.includes("shirt bot:")) {
        //   response = response.split("shirt bot:")
        //   for (var x = 0; x < response.length; x++) {
        //     if (x = 0) message.reply(response[0])
        //     else message.channel.send(response[x])
        //   }
        // } else {

        // }
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
  module.exports.bot = bot
  require("./instruct")
})
bot.on('disconnect', function(msg, code) {
  console.log(msg + "\n" + code)
  if (code === 0) return console.error(msg);
  bot.connect();
});
bot.login(config["BOT_TOKEN"])
