ons.bootstrap();

ons.ready(function() {
  var passcode = window.localStorage.getItem('pin') || '';
  var isPIN = passcode != null && passcode != '';
  if(!isPIN) {
    nav.resetToPage('app.html');
  } else {
    nav.resetToPage('pincode.html');
  }
});


angular.module('Otp', ['onsen', 'angular-md5']);

angular.module('Otp').factory('sharedService', function($rootScope) {
    var service = {};
    
    service.state = 0;

    service.prepForBroadcast = function(st) {
        this.state = st;
        this.broadcastItem();
    };

    service.broadcastItem = function() {
        $rootScope.$broadcast('handleBroadcast');
    };

    return service;
});

angular.module('Otp').controller('AppController', function ($scope, $window, $interval, md5, sharedService) {

    var countDown;
    $scope.expiredTime = 0;
    $scope.inputClass = '';
    $scope.saveInfo = function(){
        $window.localStorage.setItem('otp', angular.toJson($scope.info));
    };
    $scope.activeTab = function(index){
        tabbar.setActiveTab(index);
    };
    $scope.startCountDown = function(){
        if ( angular.isDefined(countDown) ) return;

        countDown = $interval(function() {
            if ($scope.expiredTime > 0) {
                $scope.expiredTime--;
                if ($scope.expiredTime <= 10) $scope.inputClass = 'text-red';
            } else {
                $scope.stopCountDown();
            }
          }, 1000);
    };
    $scope.stopCountDown = function(){
        if (angular.isDefined(countDown)) {
            $interval.cancel(countDown);
            countDown = undefined;
            $scope.expiredTime = 0;
            $scope.inputClass = '';
            $scope.password = '';
          }
    };

    $scope.scanCode = function(){
        $window.plugins.barcodeScanner.scan(function(result) {
            if (result.cancelled) return;
            var values = result.text.split('|');
            if (values.length < 2) {
                ons.notification.alert({title: 'Thông báo', message: 'Không đúng mật mã hệ thống'});
                return;
            }

            var expiredTime = Number(values[1].trim());
            var publicKey = values[0].trim();
            var privateKey = $scope.info.privateKey;
            var text = privateKey + '-' + publicKey;            
            var encrypt = md5.createHash(text);
            
            var mask = $scope.info.mask.split(',');
            var password = '';
            for(var i = 0; i < mask.length; i++){
                password += (mask[i] <= encrypt.length) ? encrypt[mask[i] - 1] : '';
            }
            
            $scope.password = password.toLowerCase();
            $scope.expiredTime = expiredTime - 10;
            $scope.startCountDown()
            $scope.$apply();
            navigator.notification.vibrate(1000);
        }, function(error) {
            $scope.password = '';
            $scope.expiredTime = 0;
            $scope.stopCountDown();
            $scope.$apply();
        });
    };
    $scope.setUser = function () {
        $window.plugins.barcodeScanner.scan(function(result) {
            if (result.cancelled) return;
            var values = result.text.split('|');
            if (values.length < 3 || values[0].trim() != 'user') {
                ons.notification.alert({title: 'Thông báo', message: 'Không đúng mã cài đặt'});
                return;
            }
            $scope.info.loginName = values[1].trim();
            $scope.info.privateKey = values[2].trim();
            $scope.saveInfo();
            $scope.$apply();
            navigator.notification.vibrate(1000);
        }, function(error) {
            ons.notification.alert({title: 'Thông báo', message: error});
        });
    };
    $scope.setMask = function () {
        $window.plugins.barcodeScanner.scan(function(result) {
            if (result.cancelled) return;
            var values = result.text.split('|');
            if (values.length < 2 || values[0].trim() != 'mask') {
                ons.notification.alert({title: 'Thông báo', message: 'Không đúng mã cài đặt'});
                return;
            }
            $scope.info.mask = values[1].trim();
            $scope.info.maskStatus = ($scope.info.mask) ? 'Đã cài đặt' : 'Chưa cài đặt';
            $scope.saveInfo();
            $scope.$apply();
            navigator.notification.vibrate(1000);
        }, function(error) {
            ons.notification.alert({title: 'Thông báo', message: error});
        });
    };
    $scope.deleteInfo = function () {
        ons.notification.confirm({
            message: 'Bạn muốn xoá toàn bộ thông tin cài đặt?',
            title: 'Xác nhận Xoá',
            buttonLabels: ['Huỷ', 'Đồng ý'],
            animation: 'fade',
            primaryButtonIndex: 1,
            callback: function(ind) {
                if (ind == 1){
                    if ($scope.info.passcodeStatus){
                        //set state = 3
                        $scope.showPIN(3);
                    }else{
                        $scope.info = {};
                        $scope.saveInfo();
                        $scope.$apply();
                        ons.notification.alert({title: 'Thông báo', message: 'Đã xoá thành công'});
                        navigator.notification.vibrate(1000);
                    }                
                }
            }
        });
    };
    
    //PIN
    $scope.state = 0;
    $scope.$on('handleBroadcast', function() {
        $scope.state = sharedService.state;
    });
    $scope.showPIN = function (state) {
        nav.resetToPage('pincode.html');
        sharedService.prepForBroadcast(state);
    };

    $scope.updatePIN = function () {
        if ($scope.info.passcodeStatus){
            //set state = 1
            $scope.showPIN(1);
        }else{
            //set state = 4
            $scope.showPIN(4);
        }
    };
    
    $scope.init = function(){
        $scope.state = sharedService.state;
        $scope.info = angular.fromJson($window.localStorage.getItem('otp') || '{}');
        $scope.passcode = window.localStorage.getItem('pin') || '';
        $scope.info.maskStatus = ($scope.info.mask) ? 'Đã cài đặt' : 'Chưa cài đặt';
        $scope.info.passcodeStatus = $scope.passcode != null && $scope.passcode != '';
    };
});

angular.module('Otp').controller('PinController', function ($scope, $window, sharedService) {

    $scope.state = 0;
    $scope.$on('handleBroadcast', function() {
        $scope.state = sharedService.state;
    });
    
    $scope.saveInfo = function(){
        $window.localStorage.setItem('otp', angular.toJson($scope.info));
    };
    $scope.saveCode = function(){
        $window.localStorage.setItem('pin', $scope.code);
    };
    $scope.hidePIN = function () {
        nav.resetToPage('app.html');
    };
    $scope.completePIN = function () {
        switch ($scope.state){
            case 0: //login
                if ($scope.code == $scope.passcode){
                    $scope.hidePIN();
                    navigator.notification.vibrate(1000);
                }else{
                    $scope.code = '';
                    ons.notification.alert({title: 'Thông báo', message: 'Mã PIN không đúng, bạn hãy nhập lại'});
                    navigator.notification.vibrate(1000);
                }
                break;
            case 1: //input first
                $scope.confirmCode = $scope.code;
                $scope.code = '';
                $scope.title = "Nhập lại mã PIN";
                $scope.state = 2;
                break;
            case 2: //input confirm
                if ($scope.code == $scope.confirmCode){
                    $scope.saveCode();
                    $scope.hidePIN();
                    navigator.notification.vibrate(1000);
                }else{
                    $scope.code = '';
                    ons.notification.alert({title: 'Thông báo', message: 'Mã PIN không khớp, bạn hãy nhập lại'});
                    navigator.notification.vibrate(1000);
                }
                break;
            case 3: //valid delete info
                if ($scope.code == $scope.passcode){
                    $scope.info = {};
                    $scope.saveInfo();
                    ons.notification.alert({title: 'Thông báo', message: 'Đã xoá thành công'});
                    $scope.hidePIN();
                    navigator.notification.vibrate(1000);
                }else{
                    $scope.code = '';
                    ons.notification.alert({title: 'Thông báo', message: 'Mã PIN không đúng, bạn hãy nhập lại'});
                    navigator.notification.vibrate(1000);
                }
                break;
            case 4: //turn off pin
                if ($scope.code == $scope.passcode){
                    $scope.code = '';
                    $scope.saveCode();
                    $scope.hidePIN();
                    navigator.notification.vibrate(1000);
                }else{
                    $scope.code = '';
                    ons.notification.alert({title: 'Thông báo', message: 'Mã PIN không đúng, bạn hãy nhập lại'});
                    navigator.notification.vibrate(1000);
                }
                break;
            default:
                break;
        }
    };
    $scope.addCode = function (char) {
        if ($scope.code.length < 4) $scope.code += char;
        if ($scope.code.length >= 4)  $scope.completePIN();
    };    
    $scope.removeCode = function (char) {
        if ($scope.code.length > 0) $scope.code = $scope.code.substring(0, $scope.code.length - 1);
    };    
    $scope.deleteCode = function (char) {
        $scope.code = '';
    };    
    
    $scope.init = function(){
        $scope.state = sharedService.state;
        $scope.passcode = window.localStorage.getItem('pin') || '';
        $scope.code = '';
        $scope.confirmCode = '';
        $scope.buttonBackVisible = $scope.state > 0;
        $scope.title = "Nhập mã PIN";
    };
});

AppController.$inject = ['$scope', 'sharedService'];
PinController.$inject = ['$scope', 'sharedService'];