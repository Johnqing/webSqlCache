let cacheDb = null;
let initialized = false;


const webSQL = {
    initialize: (dbname) => {
        if (!cacheDb) {
            cacheDb = window.openDatabase(dbname, "1.0", dbname, 500000);
            cacheDb.transaction((tx) => {
                tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS `cache` (' +
                    '`id` INTEGER PRIMARY KEY, ' +
                    '`updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
                    '`url` text NOT NULL, ' +
                    '`type` text, ' +
                    '`page` INTEGER(10), ' +
                    '`data` text NOT NULL DEFAULT "{}");'
                );
            });
        }

        initialized = true;
    },
    query: (sql, values, callback) => {
        if (typeof values === 'undefined') {
            values = [];
        }
        cacheDb.transaction((tx) => {
            tx.executeSql(sql, values, (tx, results) => {
                if (typeof callback == "function") {
                    callback({success: true, rowsAffected: results.rows.length, data: results});
                }
            }, (tx, error) => {
                if (typeof callback == "function") {
                    callback({success: false, rowsAffected: 0, data: error});
                }
            });
        });
    },
    set: (url, results, options, json) => {
        if(results.success === true) {
            webSQL.query('UPDATE cache SET data=? WHERE url=? AND type=? AND page=?',
                [JSON.stringify(json), url, options.cacheType, options.page], () => {
                    console.log('Success update = ' + JSON.stringify(json));
                });
        } else {
            webSQL.query('INSERT INTO cache (url, type, page, data) VALUES(?, ?, ?, ?);',
                [url, options.cacheType, options.page, JSON.stringify(json)], (results) => {
                    if(results.success === true) {
                        console.log('Success update = ' + JSON.stringify(results));
                    } else {
                        console.error('Error inserting = ' + results.data);
                    }
                });
        }
    },
    offline: (values, callback) => {
        webSQL.query('SELECT * FROM cache WHERE url=? AND type=? AND page=?;', values, (results) => {
            if (results.success === true && results.rowsAffected > 0) {
                callback({success: true, data: JSON.parse(results.data.rows.item(0).data)});
            } else {
                callback({success: false});
            }
        });
    }
};

function get(url, options = {}, getOnline = ()=> {}) {
    if (!url)
        throw new Error('Please write to URL');

    if (!initialized) {
        webSQL.initialize(options.dbname);
    }
    // 检查网络状况
    const OnLine = navigator.onLine;

    options.type = (options.type || 'get').toUpperCase();
    options.cacheType = options.cacheType || '';
    options.page = options.page || 1;
    !options.data && (options.data = {});

    options.save = options.save || false;
    options.offline = options.offline || false;

    options.success = options.success || function(){};
    options.error = options.error || function(){};

    /**
     * 断网重连
     */
    if (options.offline || !OnLine) {
        return webSQL.offline([url, options.cacheType, options.page], (results)=> {
            if (results.success === true) {
                options.success(results.data);
            } else {
                options.error(results);
            }
        });
    }
    /**
     * 成功
     * @param json
     */
    let success = (json) => {
        // 保存数据
        if(options.save == true){
            webSQL.offline([url, options.cacheType, options.page], (results) => {
                webSQL.set(url, results, options, json);
            });
        }
        if(json.code === 0){
            options.success(json);
        } else {
            options.error(json);
        }
    }

    /**
     * http请求失败
     * @param response
     */
     let error = (response) => {
        if(options.save == true){
            options.offline = true;
            get(url, options);
        }
        console.error('Ajax Error- url=' + url + ' data=' + JSON.stringify(options) + ' type=' + options.cacheType);
        options.fail && options.fail(response);
    }

    // jquery
    if(window.jQuery){
        return window.jQuery.ajax({
            type: options.type,
            url: url,
            dataType: 'json',
            data: options.data,
            async: true,
            success: success,
            error: error
        });
    }
    return getOnline(options, success, error);
}

export default get;
