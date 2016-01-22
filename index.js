var imgur = require('imgur-node-api'),
    path = require('path'),
    secrets = require('./secrets')
    SlackClient = require('slack-client');

require('shelljs/global'); //for executing external shell commands, taking picture

var conf = {
    slackToken : secrets.slackToken,
    imgurKey : secrets.imgurKey,
    newCoffeeTrigger : 'Nu finns det nybryggt kaffe!',
    thankYouText: 'Ge en applåd till den som fyllde på! ',
    localImage : 'ourhero.jpg',
    photoCommand : 'imagesnap -w 2.0 ' //should be replaced if on a raspberry with the equivialent command
};

imgur.setClientID(conf.imgurKey);

var slackClient = new SlackClient(conf.slackToken);
var bot; // Track bot user .. for detecting messages by yourself

slackClient.on('loggedIn', function(user, team) {
    bot = user;
    console.log("Logged in as " + user.name + " of " + team.name + ", but not yet connected");
});

slackClient.on('open', function() {
    console.log('Connected');
});

slackClient.on('message', function(message) {
    if (message.user == bot.id) return; // Ignore bot's own messages
    if (!message.text || !message.text.endsWith(conf.newCoffeeTrigger)) return;

    console.log(exec(conf.photoCommand + conf.localImage).output);
    var channel = slackClient.getChannelGroupOrDMByID(message.channel);

    imgur.upload(path.join(__dirname, conf.localImage), function (err, res) {
        if(err){
            console.log(err);
            return;
        }

        console.log('Uploaded image to:' + res.data.link); // Log the imgur url
        channel.send(conf.thankYouText + res.data.link);
    });

    console.log(exec(`rm ${conf.localImage}`).output);
});

slackClient.login();