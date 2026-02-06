// 数据看板页面功能

// 图表实例
let trendChart, distributionChart, accuracyChart, regionChart, hotSpotsChart;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    setupEventListeners();
});

// 初始化图表
function initializeCharts() {
    // 1. 识别数量趋势图
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            datasets: [{
                label: '识别数量',
                data: [65, 78, 92, 81, 104, 87, 95],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    title: {
                        display: true,
                        text: '识别次数'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // 2. 病虫害分布图
    const distributionCtx = document.getElementById('distributionChart').getContext('2d');
    distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['番茄晚疫病', '黄瓜白粉病', '玉米螟虫', '水稻纹枯病', '其他'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#f39c12',
                    '#9b59b6',
                    '#e74c3c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 20
                    }
                }
            }
        }
    });

    // 3. 准确率变化图
    const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
    accuracyChart = new Chart(accuracyCtx, {
        type: 'line',
        data: {
            labels: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周'],
            datasets: [{
                label: '模型准确率',
                data: [85, 88, 90, 92, 93, 94],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: true
            }, {
                label: '人工复核准确率',
                data: [90, 91, 92, 93, 94, 95],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 80,
                    max: 100,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // 4. 地区疾病分布图 - 默认显示各地区疾病密度
    initializeRegionChart('density');
    
    // 5. 病虫害高发地区图
    initializeHotSpotsChart();
}

// 初始化地区疾病分布图
function initializeRegionChart(type = 'density') {
    const regionCtx = document.getElementById('regionChart').getContext('2d');
    
    if (regionChart) {
        regionChart.destroy();
    }
    
    if (type === 'density') {
        // 显示各地区总的疾病密度（识别次数总和）
        createDensityChart(regionCtx);
    } else {
        // 显示疾病分布详情
        createDistributionChart(regionCtx);
    }
}

// 创建各地区疾病密度图表（总识别次数）
function createDensityChart(ctx) {
    // 模拟地区数据 - 各地区总的疾病密度（识别次数总和）
    const regions = ['东北地区', '华北地区', '华东地区', '华中地区', '华南地区', '西南地区', '西北地区'];
    
    // 生成各地区总的疾病密度数据（识别次数总和）
    const densityData = regions.map(region => {
        if (region === '东北地区') {
            return Math.floor(Math.random() * 200 + 350); // 350-550
        } else if (region === '华东地区') {
            return Math.floor(Math.random() * 300 + 500); // 500-800
        } else if (region === '华南地区') {
            return Math.floor(Math.random() * 250 + 400); // 400-650
        } else if (region === '西南地区') {
            return Math.floor(Math.random() * 150 + 250); // 250-400
        } else if (region === '西北地区') {
            return Math.floor(Math.random() * 100 + 150); // 150-250
        } else {
            return Math.floor(Math.random() * 200 + 300); // 300-500
        }
    });
    
    // 计算最大值用于颜色渐变
    const maxValue = Math.max(...densityData);
    
    // 生成渐变色（从绿色到红色，值越大颜色越红）
    const backgroundColors = densityData.map(value => {
        const ratio = value / maxValue;
        const hue = 120 - (ratio * 120); // 从绿色(120)渐变到红色(0)
        return `hsl(${hue}, 70%, 60%)`;
    });
    
    regionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: regions,
            datasets: [{
                label: '疾病密度（总识别次数）',
                data: densityData,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `总识别次数: ${context.raw}次`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    title: {
                        display: true,
                        text: '识别次数',
                        color: '#666'
                    },
                    ticks: {
                        stepSize: 100
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// 创建疾病分布详情图表
function createDistributionChart(ctx) {
    // 模拟地区数据 - 每个地区的不同疾病分布
    const regions = ['东北地区', '华北地区', '华东地区', '华中地区', '华南地区', '西南地区', '西北地区'];
    const diseases = ['番茄晚疫病', '黄瓜白粉病', '玉米螟虫', '水稻纹枯病', '小麦锈病'];
    
    // 生成每个地区的疾病分布数据
    const datasets = diseases.map((disease, index) => {
        const colorPalette = [
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(243, 156, 18, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(231, 76, 60, 0.8)'
        ];
        
        // 为每个疾病生成在不同地区的随机数据
        const data = regions.map(region => {
            // 根据不同地区的特性生成不同的疾病数据
            if (region === '东北地区') {
                return disease === '玉米螟虫' ? Math.floor(Math.random() * 40 + 80) : Math.floor(Math.random() * 20 + 30);
            } else if (region === '华东地区') {
                return disease === '水稻纹枯病' ? Math.floor(Math.random() * 50 + 90) : Math.floor(Math.random() * 30 + 40);
            } else if (region === '华南地区') {
                return disease === '黄瓜白粉病' ? Math.floor(Math.random() * 45 + 85) : Math.floor(Math.random() * 25 + 35);
            } else if (region === '西南地区') {
                return disease === '小麦锈病' ? Math.floor(Math.random() * 35 + 75) : Math.floor(Math.random() * 15 + 25);
            } else {
                return Math.floor(Math.random() * 30 + 50);
            }
        });
        
        return {
            label: disease,
            data: data,
            backgroundColor: colorPalette[index % colorPalette.length],
            borderColor: colorPalette[index % colorPalette.length].replace('0.8', '1'),
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.8
        };
    });
    
    regionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: regions,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}次`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    title: {
                        display: true,
                        text: '识别次数',
                        color: '#666'
                    },
                    ticks: {
                        stepSize: 20
                    },
                    stacked: false
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    },
                    stacked: false
                }
            }
        }
    });
}

// 初始化病虫害高发地区图表
function initializeHotSpotsChart() {
    const hotSpotsCtx = document.getElementById('hotSpotsChart').getContext('2d');
    
    // 模拟数据：每种病虫害在哪个地区最严重
    const diseases = [
        { name: '番茄晚疫病', topRegion: '华东地区', count: 185, severity: 'critical' },
        { name: '黄瓜白粉病', topRegion: '华南地区', count: 162, severity: 'high' },
        { name: '玉米螟虫', topRegion: '东北地区', count: 198, severity: 'critical' },
        { name: '水稻纹枯病', topRegion: '华东地区', count: 215, severity: 'critical' },
        { name: '小麦锈病', topRegion: '西南地区', count: 145, severity: 'high' },
        { name: '马铃薯晚疫病', topRegion: '华北地区', count: 128, severity: 'medium' },
        { name: '蔬菜蚜虫', topRegion: '华南地区', count: 178, severity: 'high' },
        { name: '果树炭疽病', topRegion: '华中地区', count: 95, severity: 'medium' }
    ];
    
    // 准备图表数据
    const labels = diseases.map(d => d.name);
    const data = diseases.map(d => d.count);
    const regions = diseases.map(d => d.topRegion);
    const severityColors = diseases.map(d => {
        switch(d.severity) {
            case 'critical': return '#e74c3c';
            case 'high': return '#f39c12';
            case 'medium': return '#3498db';
            case 'low': return '#2ecc71';
            default: return '#3498db';
        }
    });
    
    // 创建图表
    hotSpotsChart = new Chart(hotSpotsCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '识别次数',
                data: data,
                backgroundColor: severityColors,
                borderColor: severityColors.map(c => c.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }]
        },
        options: {
            indexAxis: 'y', // 横向条形图
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const disease = diseases[context.dataIndex];
                            return `${disease.name}: ${context.raw}次 (高发地区: ${disease.topRegion})`;
                        },
                        afterLabel: function(context) {
                            const disease = diseases[context.dataIndex];
                            let severityText = '';
                            switch(disease.severity) {
                                case 'critical': severityText = '严重'; break;
                                case 'high': severityText = '高'; break;
                                case 'medium': severityText = '中'; break;
                                case 'low': severityText = '低'; break;
                            }
                            return `严重程度: ${severityText}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    title: {
                        display: true,
                        text: '识别次数',
                        color: '#666'
                    },
                    ticks: {
                        stepSize: 50
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: false
                    }
                }
            }
        }
    });
    
    // 添加图例
    createHotSpotsLegend();
}

// 创建病虫害高发地区图例
function createHotSpotsLegend() {
    const legendContainer = document.createElement('div');
    legendContainer.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-top: 10px;
        flex-wrap: wrap;
    `;
    
    const severities = [
        { label: '严重', color: '#e74c3c', class: 'hotspot-critical' },
        { label: '高', color: '#f39c12', class: 'hotspot-high' },
        { label: '中', color: '#3498db', class: 'hotspot-medium' },
        { label: '低', color: '#2ecc71', class: 'hotspot-low' }
    ];
    
    severities.forEach(severity => {
        const legendItem = document.createElement('div');
        legendItem.className = `hotspot-info ${severity.class}`;
        legendItem.innerHTML = `
            <i class="fas fa-circle"></i> ${severity.label}严重程度
        `;
        legendContainer.appendChild(legendItem);
    });
    
    // 添加到图表下方
    const chartCard = document.querySelector('#hotSpotsChart').closest('.chart-card');
    chartCard.querySelector('.chart-wrapper').appendChild(legendContainer);
}

// 刷新病虫害高发地区数据
function refreshHotSpots() {
    const chartWrapper = document.querySelector('#hotSpotsChart').closest('.chart-wrapper');
    const originalContent = chartWrapper.innerHTML;
    
    // 显示加载状态
    chartWrapper.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666;">
            <i class="fas fa-sync fa-spin fa-2x"></i>
            <p style="margin-top: 10px;">正在分析最新高发地区数据...</p>
        </div>
    `;
    
    // 模拟数据更新延迟
    setTimeout(() => {
        // 重新初始化图表
        if (hotSpotsChart) {
            hotSpotsChart.destroy();
        }
        
        // 移除旧的图例
        const oldLegend = chartWrapper.querySelector('div[style*="display: flex; justify-content: center"]');
        if (oldLegend) {
            oldLegend.remove();
        }
        
        // 重新创建图表
        chartWrapper.innerHTML = '<canvas id="hotSpotsChart"></canvas>';
        initializeHotSpotsChart();
        
        showNotification('病虫害高发地区数据已更新！', 'success');
    }, 1500);
}

// 设置事件监听器
function setupEventListeners() {
    // 时间筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他按钮的active类
            document.querySelectorAll('.filter-btn').forEach(b => 
                b.classList.remove('active')
            );
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 根据选择的时间段更新图表
            updateChartsByPeriod(this.dataset.period);
        });
    });

    // 自定义日期选择
    document.getElementById('customDate').addEventListener('change', function() {
        updateChartsByPeriod('custom', this.value);
    });

    // 图表类型选择
    document.getElementById('trendChartSelect').addEventListener('change', function() {
        updateTrendChart(this.value);
    });

    document.getElementById('distributionChartSelect').addEventListener('change', function() {
        updateDistributionChart(this.value);
    });

    // 地区疾病分布图表选择
    document.getElementById('regionChartSelect').addEventListener('change', function() {
        initializeRegionChart(this.value);
    });

    // 点击模态框背景关闭
    document.getElementById('detailModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // 按ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// 根据时间段更新图表
function updateChartsByPeriod(period, customDate = null) {
    let data;
    
    switch(period) {
        case 'week':
            data = generateWeeklyData();
            break;
        case 'month':
            data = generateMonthlyData();
            break;
        case 'quarter':
            data = generateQuarterlyData();
            break;
        case 'year':
            data = generateYearlyData();
            break;
        case 'custom':
            data = generateCustomData(customDate);
            break;
        default:
            data = generateWeeklyData();
    }
    
    // 更新趋势图
    trendChart.data.labels = data.labels;
    trendChart.data.datasets[0].data = data.trendData;
    trendChart.update();
    
    // 更新指标
    updateMetrics(data.metrics);
}

// 生成模拟数据
function generateWeeklyData() {
    return {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        trendData: [65, 78, 92, 81, 104, 87, 95],
        metrics: {
            totalScans: '1,248',
            accuracyRate: '94.2%',
            diseaseCount: '28',
            avgProcessTime: '1.8s'
        }
    };
}

function generateMonthlyData() {
    const labels = Array.from({length: 30}, (_, i) => `${i + 1}日`);
    return {
        labels: labels,
        trendData: labels.map(() => Math.floor(Math.random() * 50 + 50)),
        metrics: {
            totalScans: '3,748',
            accuracyRate: '93.8%',
            diseaseCount: '32',
            avgProcessTime: '1.9s'
        }
    };
}

// 更新趋势图类型
function updateTrendChart(type) {
    const ctx = document.getElementById('trendChart');
    
    // 根据类型更新图表数据和配置
    let data, chartType;
    
    switch(type) {
        case 'weekly':
            chartType = 'bar';
            data = {
                labels: ['第1周', '第2周', '第3周', '第4周'],
                values: [450, 520, 480, 550]
            };
            break;
        case 'monthly':
            chartType = 'line';
            data = {
                labels: Array.from({length: 12}, (_, i) => `${i + 1}月`),
                values: Array.from({length: 12}, () => Math.floor(Math.random() * 200 + 300))
            };
            break;
        default: // daily
            chartType = 'line';
            data = {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                values: [65, 78, 92, 81, 104, 87, 95]
            };
    }
    
    // 销毁旧图表
    trendChart.destroy();
    
    // 创建新图表
    trendChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: data.labels,
            datasets: [{
                label: '识别数量',
                data: data.values,
                borderColor: '#3498db',
                backgroundColor: chartType === 'bar' ? '#3498db' : 'rgba(52, 152, 219, 0.1)',
                borderWidth: 3,
                fill: chartType !== 'bar',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    title: {
                        display: true,
                        text: '识别次数'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 更新分布图
function updateDistributionChart(type) {
    if (type === 'severity') {
        distributionChart.data.labels = ['轻微', '轻度', '中度', '重度', '严重'];
        distributionChart.data.datasets[0].data = [20, 30, 25, 15, 10];
        distributionChart.data.datasets[0].backgroundColor = [
            '#2ecc71', '#3498db', '#f39c12', '#e67e22', '#e74c3c'
        ];
    } else {
        distributionChart.data.labels = ['番茄晚疫病', '黄瓜白粉病', '玉米螟虫', '水稻纹枯病', '其他'];
        distributionChart.data.datasets[0].data = [35, 25, 20, 15, 5];
        distributionChart.data.datasets[0].backgroundColor = [
            '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c'
        ];
    }
    distributionChart.update();
}

// 更新指标显示
function updateMetrics(metrics) {
    document.getElementById('totalScans').textContent = metrics.totalScans;
    document.getElementById('accuracyRate').textContent = metrics.accuracyRate;
    document.getElementById('diseaseCount').textContent = metrics.diseaseCount;
    document.getElementById('avgProcessTime').textContent = metrics.avgProcessTime;
}

// 关闭模态框
function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    `;
    
    // 根据类型设置背景色
    const bgColors = {
        'success': '#2ecc71',
        'error': '#e74c3c',
        'info': '#3498db',
        'warning': '#f39c12'
    };
    
    notification.style.backgroundColor = bgColors[type] || '#3498db';
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
    
    // 添加动画关键帧
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}