// 个人信息页面功能

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadRecentActivities();
    setupEventListeners();
});

// 加载用户数据
function loadUserData() {
    // 从localStorage获取用户数据（实际项目中应从后端API获取）
    const userData = JSON.parse(localStorage.getItem('userData')) || getDefaultUserData();
    
    // 更新页面显示
    document.getElementById('userName').textContent = userData.fullName;
    document.getElementById('userEmail').textContent = userData.email;
    document.getElementById('scanCount').textContent = userData.scanCount;
    document.getElementById('projectCount').textContent = userData.projectCount;
    document.getElementById('fullName').value = userData.fullName;
    document.getElementById('region').value = userData.region;
    document.getElementById('birthDate').value = userData.birthDate;
    document.getElementById('phone').value = userData.phone;
}

// 默认用户数据
function getDefaultUserData() {
    return {
        fullName: '张三',
        email: 'zhangsan@example.com',
        region: 'beijing',
        birthDate: '2000-01-01',
        phone: '13800138000',
        scanCount: 128,
        projectCount: 3
    };
}

// 触发头像上传
function triggerAvatarUpload() {
    document.getElementById('avatarUpload').click();
}

// 头像上传处理
document.getElementById('avatarUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB限制
            alert('图片大小不能超过5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('userAvatar').src = event.target.result;
            // 这里可以添加上传到服务器的代码
            showNotification('头像上传成功！', 'success');
        };
        reader.readAsDataURL(file);
    }
});

// 切换编辑模式
function toggleEditMode(section) {
    const form = document.getElementById(`${section}Form`);
    const inputs = form.querySelectorAll('input, select');
    const buttons = document.getElementById(`${section}Buttons`);
    
    inputs.forEach(input => {
        input.disabled = !input.disabled;
        if (!input.disabled) {
            input.style.backgroundColor = '#fff';
        } else {
            input.style.backgroundColor = '#f8f9fa';
        }
    });
    
    buttons.style.display = buttons.style.display === 'none' ? 'flex' : 'none';
}

// 取消编辑
function cancelEdit(section) {
    const form = document.getElementById(`${section}Form`);
    const inputs = form.querySelectorAll('input, select');
    const buttons = document.getElementById(`${section}Buttons`);
    
    // 恢复原始数据
    loadUserData();
    
    inputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = '#f8f9fa';
    });
    
    buttons.style.display = 'none';
}

// 保存基本信息
document.getElementById('basicInfoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        fullName: document.getElementById('fullName').value,
        region: document.getElementById('region').value,
        birthDate: document.getElementById('birthDate').value,
        phone: document.getElementById('phone').value
    };
    
    // 这里应该发送数据到后端API
    localStorage.setItem('userData', JSON.stringify(formData));
    
    // 更新显示
    document.getElementById('userName').textContent = formData.fullName;
    
    // 退出编辑模式
    cancelEdit('basicInfo');
    
    showNotification('个人信息更新成功！', 'success');
});

// 加载最近活动
function loadRecentActivities() {
    const activities = [
        {
            icon: 'fas fa-search',
            title: '病虫害识别',
            description: '识别了番茄晚疫病',
            time: '2小时前'
        },
        {
            icon: 'fas fa-chart-line',
            title: '数据分析',
            description: '查看了7月份识别报告',
            time: '昨天'
        },
        {
            icon: 'fas fa-upload',
            title: '数据上传',
            description: '上传了10张样本图片',
            time: '3天前'
        },
        {
            icon: 'fas fa-user-friends',
            title: '团队协作',
            description: '与团队成员讨论项目进展',
            time: '5天前'
        }
    ];
    
    const container = document.getElementById('recentActivities');
    container.innerHTML = '';
    
    activities.forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">
                ${activity.time}
            </div>
        `;
        container.appendChild(activityElement);
    });
}

// 修改密码功能
function changePassword() {
    const currentPassword = prompt('请输入当前密码：');
    if (!currentPassword) return;
    
    const newPassword = prompt('请输入新密码：');
    if (!newPassword) return;
    
    const confirmPassword = prompt('请确认新密码：');
    
    if (newPassword !== confirmPassword) {
        showNotification('两次输入的密码不一致！', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('密码长度不能少于6位！', 'error');
        return;
    }
    
    // 这里应该发送请求到后端修改密码
    showNotification('密码修改成功！', 'success');
}

// 导出数据功能
function exportData() {
    const userData = JSON.parse(localStorage.getItem('userData')) || getDefaultUserData();
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-data-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('数据导出成功！', 'success');
}

// 设置事件监听器
function setupEventListeners() {
    // 开关切换监听
    document.getElementById('notificationToggle').addEventListener('change', function(e) {
        saveSetting('notifications', e.target.checked);
    });
    
    document.getElementById('darkModeToggle').addEventListener('change', function(e) {
        saveSetting('darkMode', e.target.checked);
        toggleDarkMode(e.target.checked);
    });
    
    document.getElementById('autoBackupToggle').addEventListener('change', function(e) {
        saveSetting('autoBackup', e.target.checked);
    });
}

// 保存设置
function saveSetting(key, value) {
    const settings = JSON.parse(localStorage.getItem('userSettings')) || {};
    settings[key] = value;
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    showNotification('设置已保存', 'success');
}

// 切换深色模式
function toggleDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒后移除通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 添加通知样式
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification-success {
        background: #2ecc71;
    }
    
    .notification-error {
        background: #e74c3c;
    }
    
    .notification-info {
        background: #3498db;
    }
    
    .dark-mode {
        background: #1a1a2e;
        color: #ffffff;
    }
    
    .dark-mode .section-card {
        background: #16213e;
        color: #ffffff;
    }
`;
document.head.appendChild(style);