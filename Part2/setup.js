// setup.js - 快速设置脚本
async function setupImageLibrary() {
    console.log('🚀 正在设置病害图像库...');
    
    try {
        // 检查图像数据文件是否存在
        const response = await fetch('images/frontend_images.json');
        if (!response.ok) {
            console.warn('⚠️ 图像数据文件不存在，将使用内置数据');
            return false;
        }
        
        const data = await response.json();
        console.log(`✅ 发现 ${data.images.length} 张病害图像`);
        console.log(`🌿 包含作物: ${data.crops.join(', ')}`);
        
        // 更新首页统计
        const statsEl = document.querySelector('.stats');
        if (statsEl) {
            const imageStat = document.createElement('div');
            imageStat.className = 'stat-item';
            imageStat.innerHTML = `
                <i class="fas fa-images"></i>
                <span>病害图像: <strong>${data.images.length}</strong></span>
            `;
            statsEl.appendChild(imageStat);
        }
        
        return true;
    } catch (error) {
        console.error('❌ 设置图像库时出错:', error);
        return false;
    }
}

// 页面加载完成后运行
document.addEventListener('DOMContentLoaded', setupImageLibrary);