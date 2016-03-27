# webSqlCache
## USE
```
import webSqlCache from './webSqlCache';
webSqlCache('http://liluo.me', {
  dbname: 'liluo',
  cacheType: 'index',
  offline: false,
  type: 'get',
  data: {
    page: 1
  },
  save: true,
  success: (res) => {console.log(res);},
  error: (res) => {console.log(res);}
}, (options, success, error) => {
  $http({
    url: options.url,
    method: options.type,
    params: options.data
  })
  .success(success)
  .error(error);
});
```
