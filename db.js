'use strict';
const sqlite = require('sqlite');
const dbPromise = Promise.resolve()
  .then(() => sqlite.open(__dirname + '/sqlite3.db', { Promise }))
  .then(db => db.migrate({ force: 'last' }));

var database = {

/*

    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT, 
    link TEXT,
    pubDate TEXT,
    content TEXT,
    contentSnippet TEXT,
    guid TEXT UNIQUE,
    categories TEXT,
    isoDate TEXT

*/

    getUserInRegions: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.all("SELECT * FROM regions WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (rows) {
                    resolve(rows);
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    getUserInVendors: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.all("SELECT * FROM vendors WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (rows) {
                    resolve(rows);                              
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    getUserInDevices: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.all("SELECT * FROM devices WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (rows) {
                    resolve(rows);                              
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },    

    getUsersInDevice: function (device) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.all("SELECT user_id FROM devices WHERE device = $device", {
                    $device: device
                }).then(function (rows) {
                    resolve(rows);                              
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    getUnsentFeeds: function () {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.all("SELECT * FROM feed WHERE status = $status", {
                    $status: 0
                }).then(function (rows) {
                    resolve(rows);                              
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    setFeedSent: function (feedId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.run("UPDATE feed SET status = $status WHERE id = $feedId", {
                    $feedId: feedId,
                    $status: 1
                }).then(function () {
                    resolve();                              
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    feedItemExists: function (guid) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                db.get("SELECT id FROM feed WHERE guid = $guid", {
                    $guid: guid
                }).then(function (row) {
                    resolve(row ? true : false);                    
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    recordFeed: function (title, link, pubDate, content, contentSnippet, guid, categories, isoDate, status) {        
        return new Promise(function (resolve, reject) {

            database.feedItemExists(guid).then(function (result) {
                if (!result) {
                    dbPromise.then(function (db) {
                        db.run("INSERT INTO feed (title, link, pubDate, content, contentSnippet, guid, categories, isoDate, status) VALUES ($title, $link, $pubDate, $content, $contentSnippet, $guid, $categories, $isoDate, $status)", {
                            $title: title, 
                            $link: link, 
                            $pubDate: pubDate, 
                            $content: content, 
                            $contentSnippet: contentSnippet, 
                            $guid: guid, 
                            $categories: categories, 
                            $isoDate: isoDate, 
                            $status: status
                        }).then(function (statement) {
                            resolve(statement .lastID);                    
                        }).catch(error => reject(error));
                    }).catch(err => console.log('DB Promise error', err))      
                }
                
            }).catch(function (error) {
                reject(error);
            });
            
        });

    },

    deleteUserDevices: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                // console.log("dropping");
                db.run("DELETE FROM devices WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (statement) {
                    resolve(statement .lastID);                    
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    deleteUserRegions: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                // console.log("dropping");
                db.run("DELETE FROM regions WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (statement) {
                    resolve(statement .lastID);                    
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },

    deleteUserVendors: function (userId) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                // console.log("dropping");
                db.run("DELETE FROM vendors WHERE user_id = $userId", {
                    $userId: userId
                }).then(function (statement) {
                    resolve(statement .lastID);                    
                }).catch(error => reject(error));
            }).catch(err => console.log('DB Promise error', err))  
        });
    },


    setActiveDevicesForUserId: function (userId, devices) {
        console.log("setActiveDevicesForUserId: ", userId, devices)
        return new Promise(function (resolve, reject) {
            database.deleteUserDevices(userId)
            .then(
                dbPromise.then(function (db) {
                    // console.log("inserting");
                    devices.forEach(function (item) {
                        db.run("INSERT INTO devices (device, user_id) VALUES ($device, $userId)", {
                            $device: item,
                            $userId: userId
                        }).then(function (statement) {
                            resolve(statement .lastID);                    
                        }).catch(error => reject(error));    
                    });    
                }).catch(err => console.log('DB Promise error', err))  
            )
            .catch(function (error) {
                reject(error);
            });
        }).catch(function (error) {
            reject(error);
        });
    },


    setActiveRegionsForUserId: function (userId, regions) {
        return new Promise(function (resolve, reject) {
            database.deleteUserRegions(userId)
            .then(
                dbPromise.then(function (db) {
                    // console.log("inserting");
                    regions.forEach(function (item) {
                        db.run("INSERT INTO regions (region, user_id) VALUES ($region, $userId)", {
                            $region: item,
                            $userId: userId
                        }).then(function (statement) {
                            resolve(statement .lastID);                    
                        }).catch(error => reject(error));    
                    });    
                }).catch(err => console.log('DB Promise error', err))  
            )
        }).catch(function (error) {
            reject(error);
        });
    },


    setActiveVendorsForUserId: function (userId, vendors) {
        return new Promise(function (resolve, reject) {
            database.deleteUserVendors(userId)
            .then(
                dbPromise.then(function (db) {
                    // console.log("inserting");
                    vendors.forEach(function (item) {
                        db.run("INSERT INTO vendors (vendor, user_id) VALUES ($vendor, $userId)", {
                            $vendor: item,
                            $userId: userId
                        }).then(function (statement) {
                            resolve(statement .lastID);                    
                        }).catch(error => reject(error));    
                    });    
                }).catch(err => console.log('DB Promise error', err))  
            )
        }).catch(function (error) {
            reject(error);
        });
    },

};

module.exports = database;