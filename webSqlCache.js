let cacheDb = null;
let initialized = false;


const webSQL = {
    initialize: (dbname) => {
        if (cacheDb) {
            cacheDb = window.openDatabase(dbname, "1.0", dbname, 500000);
            cacheDb.transaction(function (tx) {
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
        cacheDb.transaction(function (tx) {
            tx.executeSql(sql, values, function (tx, results) {
                if (typeof callback == "function") {
                    callback({success: true, rowsAffected: results.rows.length, data: results});
                }
            }, function (tx, error) {
                if (typeof callback == "function") {
                    callback({success: false, rowsAffected: 0, data: error});
                }
            });
        });
    },
    offline: (values, callback) => {
        this.query('SELECT * FROM cache WHERE url=? AND type=? AND page=?;', values, (results) => {
            if (results.success === true && results.rowsAffected > 0) {
                callback({success: true, data: JSON.parse(results.data.rows.item(0).data)});
            } else {
                callback({success: false});
            }
        });
    }
};

function agent(url, options = {}, getOnline = ()=> {}) {
    if (!url)
        throw new Error('Please write to URL');

    if (!initialized) {
        webSQL.initialize(options.dbname);
    }
    // 检查网络状况
    const OnLine = navigator.onLine;

    options.type = (options.type || 'get').toUpperCase();
    options.cacheType = options.cacheType || '';
    !options.data && (options.data = {});

    options.save = options.save || false;
    options.offline = options.offline || false;

    options.success = options.success || function(){};
    options.error = options.error || function(){};

    /**
     * 断网重连
     */
    if (options.offline || !OnLine) {
        return webSQL.offline([url, options.cacheType, options.page || 1], (results)=> {
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
    function success(json) => {
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
    function error(response) => {
        if(options.fail){
            options.offline = true;
            get(url, options);
        }
        console.log('Ajax Error- url=' + url + ' data=' + JSON.stringify(params) + ' type=' + type);
        options.fail && options.fail(response);
    }

    // jquery
    if(!window.jQuery){
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

export default agent;
