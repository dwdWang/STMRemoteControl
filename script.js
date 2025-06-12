// 蓝牙控制器类
class BluetoothController {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        
        // JDY-10模块的UUID
        this.serviceUUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
        this.characteristicUUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
        
        // 命令映射
        this.commands = {
            LED1_TOGGLE: 1,
            LED2_TOGGLE: 2,
            LED3_TOGGLE: 3,
            LED4_TOGGLE: 4,
            DISPLAY_MODE: 5,
            ALL_LEDS_OFF: 6,
            MOTOR_MODE: 7
        };
        
        // 状态跟踪
        this.ledStates = [false, false, false, false];
        this.displayMode = 0;
        this.motorMode = 0;
        
        this.initializeUI();
        this.bindEvents();
    }
    
    // 初始化UI
    initializeUI() {
        this.updateConnectionStatus(false);
        this.updateLEDIndicators();
        this.updateModeDisplays();
        
        // 检查浏览器支持
        if (!navigator.bluetooth) {
            this.showMessage('您的浏览器不支持Web Bluetooth API。请使用Chrome、Edge或Opera浏览器。', 'error');
            document.getElementById('connectBtn').disabled = true;
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 连接按钮
        document.getElementById('connectBtn').addEventListener('click', () => {
            if (this.isConnected) {
                this.disconnect();
            } else {
                this.connect();
            }
        });
        
        // LED控制按钮
        document.querySelectorAll('.led-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = parseInt(btn.dataset.command);
                this.sendCommand(command);
                this.toggleLEDState(command - 1);
            });
        });
        
        // 其他控制按钮
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = parseInt(btn.dataset.command);
                this.sendCommand(command);
                this.handleActionCommand(command);
            });
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.isConnected) return;
            
            switch(e.key) {
                case '1': this.sendCommand(this.commands.LED1_TOGGLE); this.toggleLEDState(0); break;
                case '2': this.sendCommand(this.commands.LED2_TOGGLE); this.toggleLEDState(1); break;
                case '3': this.sendCommand(this.commands.LED3_TOGGLE); this.toggleLEDState(2); break;
                case '4': this.sendCommand(this.commands.LED4_TOGGLE); this.toggleLEDState(3); break;
                case '5': this.sendCommand(this.commands.DISPLAY_MODE); this.handleActionCommand(5); break;
                case '6': this.sendCommand(this.commands.ALL_LEDS_OFF); this.handleActionCommand(6); break;
                case '7': this.sendCommand(this.commands.MOTOR_MODE); this.handleActionCommand(7); break;
            }
        });
    }
    
    // 连接蓝牙设备
    async connect() {
        try {
            this.showMessage('正在搜索蓝牙设备...', 'info');
            document.getElementById('connectBtn').classList.add('loading');
            
            // 请求蓝牙设备
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [this.serviceUUID] },
                    { namePrefix: 'JDY-10' },
                    { namePrefix: 'JDY' }
                ],
                optionalServices: [this.serviceUUID]
            });
            
            // 监听设备断开事件
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });
            
            // 连接到GATT服务器
            this.server = await this.device.gatt.connect();
            
            // 获取服务
            this.service = await this.server.getPrimaryService(this.serviceUUID);
            
            // 获取特征
            this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
            
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.updateDeviceInfo();
            this.showMessage('蓝牙设备连接成功！', 'success');
            
        } catch (error) {
            console.error('连接失败:', error);
            this.showMessage(`连接失败: ${error.message}`, 'error');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        } finally {
            document.getElementById('connectBtn').classList.remove('loading');
        }
    }
    
    // 断开连接
    async disconnect() {
        try {
            if (this.device && this.device.gatt.connected) {
                await this.device.gatt.disconnect();
            }
            this.onDisconnected();
            this.showMessage('已断开蓝牙连接', 'info');
        } catch (error) {
            console.error('断开连接失败:', error);
            this.showMessage(`断开连接失败: ${error.message}`, 'error');
        }
    }
    
    // 处理断开连接事件
    onDisconnected() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.updateConnectionStatus(false);
        this.hideDeviceInfo();
    }
    
    // 发送命令
    async sendCommand(command) {
        if (!this.isConnected || !this.characteristic) {
            this.showMessage('设备未连接', 'error');
            return false;
        }
        
        try {
            // 将命令转换为字节数组
            const data = new Uint8Array([command]);
            await this.characteristic.writeValue(data);
            console.log(`发送命令: ${command}`);
            return true;
        } catch (error) {
            console.error('发送命令失败:', error);
            this.showMessage(`发送命令失败: ${error.message}`, 'error');
            return false;
        }
    }
    
    // 切换LED状态
    toggleLEDState(ledIndex) {
        if (ledIndex >= 0 && ledIndex < 4) {
            this.ledStates[ledIndex] = !this.ledStates[ledIndex];
            this.updateLEDIndicators();
        }
    }
    
    // 处理动作命令
    handleActionCommand(command) {
        switch(command) {
            case 5: // 显示模式
                this.displayMode = (this.displayMode + 1) % 4;
                this.updateModeDisplays();
                break;
            case 6: // 关闭所有LED
                this.ledStates = [false, false, false, false];
                this.updateLEDIndicators();
                break;
            case 7: // 电机模式
                this.motorMode = (this.motorMode + 1) % 4;
                this.updateModeDisplays();
                break;
        }
    }
    
    // 更新连接状态
    updateConnectionStatus(connected) {
        const statusLight = document.getElementById('statusLight');
        const statusText = document.getElementById('statusText');
        const connectBtn = document.getElementById('connectBtn');
        const controlBtns = document.querySelectorAll('.led-btn, .action-btn');
        
        if (connected) {
            statusLight.classList.add('connected');
            statusText.textContent = '已连接';
            connectBtn.textContent = '断开连接';
            controlBtns.forEach(btn => btn.disabled = false);
        } else {
            statusLight.classList.remove('connected');
            statusText.textContent = '未连接';
            connectBtn.textContent = '连接蓝牙设备';
            controlBtns.forEach(btn => btn.disabled = true);
        }
    }
    
    // 更新设备信息
    updateDeviceInfo() {
        const deviceInfo = document.getElementById('deviceInfo');
        const deviceName = document.getElementById('deviceName');
        const deviceId = document.getElementById('deviceId');
        
        if (this.device) {
            deviceName.textContent = this.device.name || '未知设备';
            deviceId.textContent = this.device.id || '未知ID';
            deviceInfo.style.display = 'block';
        }
    }
    
    // 隐藏设备信息
    hideDeviceInfo() {
        document.getElementById('deviceInfo').style.display = 'none';
    }
    
    // 更新LED指示器
    updateLEDIndicators() {
        for (let i = 0; i < 4; i++) {
            const indicator = document.getElementById(`ledIndicator${i + 1}`);
            if (this.ledStates[i]) {
                indicator.classList.add('on');
            } else {
                indicator.classList.remove('on');
            }
        }
    }
    
    // 更新模式显示
    updateModeDisplays() {
        document.getElementById('displayMode').textContent = `模式 ${this.displayMode}`;
        document.getElementById('motorMode').textContent = `模式 ${this.motorMode}`;
    }
    
    // 显示消息
    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.classList.add('show');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.bluetoothController = new BluetoothController();
    
    // 添加一些额外的交互效果
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('mouseup', () => {
            btn.style.transform = '';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
    
    // 添加页面可见性变化处理
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && window.bluetoothController.isConnected) {
            console.log('页面隐藏，保持蓝牙连接');
        } else if (!document.hidden && window.bluetoothController.isConnected) {
            console.log('页面显示，蓝牙连接状态正常');
        }
    });
    
    // 添加错误处理
    window.addEventListener('error', (e) => {
        console.error('页面错误:', e.error);
        if (window.bluetoothController) {
            window.bluetoothController.showMessage('发生了一个错误，请刷新页面重试', 'error');
        }
    });
    
    // 添加未处理的Promise拒绝处理
    window.addEventListener('unhandledrejection', (e) => {
        console.error('未处理的Promise拒绝:', e.reason);
        if (window.bluetoothController) {
            window.bluetoothController.showMessage('操作失败，请重试', 'error');
        }
    });
});

