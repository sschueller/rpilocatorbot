require('dotenv').config()
let Parser = require('rss-parser');
let parser = new Parser();

const database = require(__dirname + '/db.js');
const config = require(__dirname + '/config.json');

const BUTTONS = {
    devices: {
        label: 'Devices',
        command: '/devices'
    },
    regions: {
        label: '🌍 Regions',
        command: '/regions'
    },
    vendors: {
        label: 'Vendors',
        command: '/vendors'
    },
    stop: {
        label: 'STOP!',
        command: '/stop'
    }        
};

const TeleBot = require('telebot');
const bot = new TeleBot({
    token: process.env.BOT_TOKEN,
    usePlugins: ['namedButtons'],
    pluginConfig: {
        namedButtons: {
            buttons: BUTTONS
        }
    }    
});

let userSession = [];

bot.on('/start', msg => {

    bot.deleteMessage(msg.chat.id, msg.message_id).catch(function(err) {
        console.log(err);
    });

    let replyMarkup = bot.keyboard([
        [
            BUTTONS.devices.label, 
            BUTTONS.regions.label, 
            BUTTONS.vendors.label, 
         ], [
             BUTTONS.stop.label, 
        ]
    ], {resize: true});

    return bot.sendMessage(msg.from.id, 'Welcome to the RPI Locator Bot (not officially associated with rpilocator.com). Please select at least a device to be notified as soon as stock is available. Press STOP! to turn off this bot. Please send your feeback to @sschueller', {replyMarkup});

});

// Inline buttons
bot.on('/devices', msg => {

    bot.deleteMessage(msg.chat.id, msg.message_id).catch(function(err) {
        console.log(err);
    });

    showKeyboard(msg, 'Please select for which Devices you want to be notified: ', 1);
});

bot.on('/regions', msg => {

    bot.deleteMessage(msg.chat.id, msg.message_id).catch(function(err) {
        console.log(err);
    });

    showKeyboard(msg, 'Please select for which Regions you want to be notified (For all unselect all of them): ', 2);
});

bot.on('/vendors', msg => {

    bot.deleteMessage(msg.chat.id, msg.message_id).catch(function(err) {
        console.log(err);
    });

    showKeyboard(msg, 'Please select for which Vendors you want to be notified (For all unselect all of them): ', 3);
});

bot.on('/stop', msg => {    

    bot.deleteMessage(msg.chat.id, msg.message_id).catch(function(err) {
        console.log(err);
    });

    database.deleteUserDevices(msg.from.id).then(function() {
        return database.deleteUserRegions(msg.from.id);
    }).then(function() {
        return database.deleteUserVendors(msg.from.id);
    }).then(function() {
        return bot.sendMessage(msg.from.id, 'All records removed', {});
      
    }).catch(function () {
        console.log("Errror removing user");
    }); 
});

// On button callback
bot.on('callbackQuery', msg => {
    return callbackQuery(msg);
});


bot.start();

// grab rss feed every minute
let interval = setInterval(function() {
    (async () => {
        let feed = await parser.parseURL('https://rpilocator.com/feed/');
        feed.items.forEach((item) => {
            // console.log(item.title);
            database.recordFeed(
                item.title, 
                item.link, 
                item.pubDate, 
                item.content, 
                item.contentSnippet, 
                item.guid, 
                JSON.stringify(item.categories), 
                item.isoDate,
                0
            );
        });

        sendNotifications();

    })();      

}, 60000);



function showKeyboard(msg, text, type) {

    if (sessionGet(msg.from.id, "item1") === undefined) {
        getRecords(msg)
    }

    let previousKeyBoard = sessionGet(msg.from.id, "currentKeyboard");

    if (previousKeyBoard !== type) {
        sessionSave(msg.from.id, "currentKeyboard", type);

        let markup = updateDeviceKeyboard("", msg.from.id);
        if (type === 2) {
            markup = updateRegionKeyboard("", msg.from.id);
        } else if (type === 3) {
            markup = updateVendorKeyboard("", msg.from.id);
        }

        let lastMessage = sessionGet(msg.from.id, "lastMessage");
        
        if (previousKeyBoard !== 0 && lastMessage) {
   
            const [chatId, messageId] = lastMessage;    
  
            return bot.editMessageText({chatId, messageId}, text). then(function () {
                return bot.editMessageReplyMarkup(
                    {chatId, messageId}, {markup}
                ).then(re => {
                    sessionSave(msg.from.id, "lastMessage", [msg.from.id, re.message_id]);
                }).catch(function (err) {
                    console.log(err);
                });
            }).catch(function (err) {
                console.log(err);
            })            
           

        } else {

            return bot.sendMessage(
                msg.from.id, text, {markup}
            ).then(re => {
                sessionSave(msg.from.id, "lastMessage", [msg.from.id, re.message_id]);
            });
        }


    } else {
        sessionSave(msg.from.id, "lastMessage", [msg.from.id, ""]);
    }
}


function sendNotifications() {
    // console.log("sendNotifications");

    database.getUnsentFeeds().then(function (feeds) {
      if (!feeds) {
        console.error('No Feeds');
      }

      feeds.forEach(function (item) {
    
        let device = "";
        let region = "";
        let vendor = "";

        let cats = JSON.parse(item.categories);

        cats.forEach(function (category) {
            if (category.match(/^([a-zA-Z]{2})$/)) {
                region = category;
            } else if (category.match(/^([a-zA-Z0-9]{3,6})$/)) {
                device = category;
            } else {
                vendor = category;
            }
        })

        if (device) {
            
            // find users in device db            
            database.getUsersInDevice(device).then(function (users) {
                if (!users) {
                  console.error('No entry');
                }                
                users.forEach(function (user) {
                    let sendMessage = true;
                    database.getUserInRegions(user.user_id).then(function (regions) {
                        if (regions.length !== 0) {
                            sendMessage = false;
                            // check if we have a match otherwise block
                            regions.every(function (regionDb) {
                                if (regionDb.region === region) {
                                    sendMessage = true;
                                    return false;
                                }
                                return true;
                            })
                        }
                        return database.getUserInVendors(user.user_id);
                    }).then(function (vendors) {
                        if (vendors.length !== 0) {
                            sendMessage = false;
                            // check if we have a match otherwise block
                            vendors.every(function (vendorDb) {
                                if (vendorDb.vendor === vendor) {
                                    sendMessage = true;
                                    return false;
                                }
                                return true;
                            })
                        }
                        // send update
                        if (sendMessage) {
                            bot.sendMessage(
                                user.user_id,   item.title + ' --> ' +  item.link, {}
                            )
                        }
                    });
                });
            }).then(function () {
                // mark as sent
                // console.log("Mark as sent: ", item.id);
                database.setFeedSent(item.id);

            });
    

        } else {
            console.log("no device indentified: ", item);
        }

      });

    }).catch(function (message) {
      console.error('DB Error: ', message);
    });



}

function updateDeviceKeyboard(device, chatId) {
    return keyboard(1, config.devices, chatId, device);
}

function updateRegionKeyboard(region, chatId) {
    return keyboard(2, config.regions, chatId, region);
}

function updateVendorKeyboard(vendor, chatId) {
    return keyboard(3, config.vendors, chatId, vendor);
}

function keyboard(type, items, chatId, currentItemClick) {

    let selectKey = "item" + type;

    let selectedItems = sessionGet(chatId, selectKey);

    if (selectedItems === undefined) {
        selectedItems = [];
    }

    if (currentItemClick !== undefined && currentItemClick !== "") {
        if (selectedItems.indexOf(currentItemClick) === -1) {
            selectedItems.push(currentItemClick)
        } else {
            selectedItems.splice(selectedItems.indexOf(currentItemClick), 1);
        }
        sessionSave(chatId, selectKey, selectedItems);
    }


    let activeIcon = "✅"

    let buttons = [];
    let counter = 1;
    let int = [];

    items.forEach(function (element, iter) {
        
        let elementDisp = element.display;
        if (selectedItems.indexOf(element.value) !== -1) {
            elementDisp = activeIcon + " " + element.display;
        }
        int.push(
            bot.inlineButton(elementDisp, {callback: element.value}),
        )
        
        if (counter > 1 || iter === (items.length - 1)) {
            counter = 0;
            buttons.push(int);
            int = [];
        }
        
        counter++;
    })

    buttons.push([bot.inlineButton("Done", {callback: "done"})]);

    return bot.inlineKeyboard(
        buttons
    );   
}


function sessionSave(userId, key, value) {
    let inline = false
    userSession.every(function (item) {
        if (item.userId === userId) {
            item[key] = value;
            inline = true;
            return false;  
        }
        return true;
    });
    if (!inline) {
        userSession.push(
            {
                userId: userId,
                [key]: value
            }
        );
    }
}

function sessionGet(userId, key) {
    let value;
    userSession.every(function (item) {
        if (item.userId === userId) {
            if (item[key] !== undefined) {
                value = item[key];
                return false;
            }
        }
        return true;
    });
    return value;
}

function getRecords(msg) {
    database.getUserInDevices(msg.from.id).then(function(devices) {

        let devs = [];
        devices.forEach(function (item) {
            devs.push(item.device);
        })
        sessionSave(msg.from.id, "item1", devs);

        return database.getUserInRegions(msg.from.id);
    }).then(function(regions) {

        let regs = [];
        regions.forEach(function (item) {
            regs.push(item.region);
        })
        sessionSave(msg.from.id, "item2", regs);

        return database.getUserInVendors(msg.from.id);
    }).then(function(vendors) {

        let vends = [];
        vendors.forEach(function (item) {
            vends.push(item.vendor);
        })
        sessionSave(msg.from.id, "item3", vends);
        return;
    }).catch(function () {
        console.log("Errror removing user");
    }); 
}


function callbackQuery(msg) {

    // Send confirm
    bot.answerCallbackQuery(msg.id);

    const data = msg.data;

    let lastMessage = sessionGet(msg.from.id, "lastMessage");

    if (lastMessage) {
   
        const [chatId, messageId] = lastMessage;    
    
        if (sessionGet(msg.from.id, "currentKeyboard") === 1) {        
            if (data === "done") {
    
                sessionSave(msg.from.id, "currentKeyboard", 0);
                let newItems = sessionGet(msg.from.id, "item1");
    
                if (newItems === undefined || newItems.length === 0) {
                    database.deleteUserDevices(msg.from.id)
                    .then(function () {
                            sessionSave(msg.from.id, "currentKeyboard", 0);
                            try {
                                bot.editMessageText({chatId, messageId}, 'Device Selection Saved');
                            } catch (e) {
                                console.log("wtf: ", e);
                            }
                            return bot.editMessageReplyMarkup({chatId, messageId}, {});
                        }
                    ).catch(function (message) {
        
                    }); 
                } else {
                    database.setActiveDevicesForUserId(msg.from.id, sessionGet(msg.from.id, "item1"))
                    .then(function () {
                            sessionSave(msg.from.id, "currentKeyboard", 0);
                            try {
                                bot.editMessageText({chatId, messageId}, 'Device Selection Saved');
                            } catch (e) {
                                console.log("wtf: ", e);
                            }
                            return bot.editMessageReplyMarkup({chatId, messageId}, {});
                        }
                    ).catch(function (message) {
        
                    });           
                }
    
    
            } else {
                let replyMarkup = updateDeviceKeyboard(data, chatId);
                // Edit message markup
                return bot.editMessageReplyMarkup({chatId, messageId}, {replyMarkup});
            }
        }
    
        if (sessionGet(msg.from.id, "currentKeyboard") === 2) {       
            if (data === "done") {
    
                sessionSave(msg.from.id, "currentKeyboard", 0);
                let newItems = sessionGet(msg.from.id, "item2");
    
                if (newItems === undefined || newItems.length === 0) {
                    database.deleteUserRegions(msg.from.id)           
                    .then(function () {
                        sessionSave(msg.from.id, "currentKeyboard", 0);
                        try {
                            bot.editMessageText({chatId, messageId}, 'Region Selection Saved');
                        } catch (e) {
                            console.log("wtf: ", e);
                        }
                        return bot.editMessageReplyMarkup({chatId, messageId}, {});; 
                    }).catch(function (message) {
    
                    });
                } else {
                    database.setActiveRegionsForUserId(msg.from.id, sessionGet(msg.from.id, "item2"))           
                    .then(function () {
                        sessionSave(msg.from.id, "currentKeyboard", 0);
                        try {
                            bot.editMessageText({chatId, messageId}, 'Region Selection Saved');
                        } catch (e) {
                            console.log("wtf: ", e);
                        }
                        return bot.editMessageReplyMarkup({chatId, messageId}, {});; 
                    }).catch(function (message) {
    
                    });
                }
    
            } else {
                let replyMarkup = updateRegionKeyboard(data, chatId);
                // Edit message markup
                return bot.editMessageReplyMarkup({chatId, messageId}, {replyMarkup});
            }
        }
    
        if (sessionGet(msg.from.id, "currentKeyboard") === 3) {       
            if (data === "done") {
    
                sessionSave(msg.from.id, "currentKeyboard", 0);
                let newItems = sessionGet(msg.from.id, "item3");
    
                if (newItems === undefined || newItems.length === 0) {
                    database.deleteUserVendors(msg.from.id)      
                    .then(function () {
                        sessionSave(msg.from.id, "currentKeyboard", 0);
                        try {
                            bot.editMessageText({chatId, messageId}, 'Vendor Selection Saved');
                        } catch (e) {
                            console.log("wtf: ", e);
                        }
                        return bot.editMessageReplyMarkup({chatId, messageId}, {});
                    }).catch(function (message) {
        
                    });  
                } else {
    
                    database.setActiveVendorsForUserId(msg.from.id, sessionGet(msg.from.id, "item3"))
                    .then(function () {
                        sessionSave(msg.from.id, "currentKeyboard", 0);
                        try {
                            bot.editMessageText({chatId, messageId}, 'Vendor Selection Saved');
                        } catch (e) {
                            console.log("wtf: ", e);
                        }
                        return bot.editMessageReplyMarkup({chatId, messageId}, {});
                    }).catch(function (message) {
        
                    });  
                }
    
            } else {
                let replyMarkup = updateVendorKeyboard(data, chatId);
                // Edit message markup
                return bot.editMessageReplyMarkup({chatId, messageId}, {replyMarkup});
            }
        }
    }
}