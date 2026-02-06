const CONFIG = {
    MAX_COMPARE_ITEMS: 4,
    DEBOUNCE_DELAY: 300,
    IMAGE_LOAD_TIMEOUT: 5000,
    LAZY_LOAD_OFFSET: 200,
    IMAGES_PER_PAGE: 12
};

// 全局变量
let diseasesData = [];
let filteredDiseases = [];
let fuseInstance = null;
let searchHistory = JSON.parse(localStorage.getItem('disease_search_history') || '[]');
let knowledgeGraphChart = null;
let favorites = JSON.parse(localStorage.getItem('disease_favorites') || '[]');
let compareItems = JSON.parse(localStorage.getItem('disease_compare') || '[]');
let currentPage = 'home';
let currentFilters = {
    severity: 'all',
    crop: 'all',
    pathogen: 'all',
    condition: 'all'
};

// 图像库变量
let imagesData = null;
let filteredImages = [];
let currentImagePage = 1;
let selectedImageIds = new Set();
let currentImageIndex = 0;
let currentZoom = 1;
let slideshowInterval = null;

// DOM元素
const diseaseGrid = document.getElementById('diseaseGrid');
const diseaseModal = document.getElementById('diseaseModal');
const compareModal = document.getElementById('compareModal');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchTrigger = document.getElementById('searchTrigger');
const searchClose = document.getElementById('searchClose');
const filterTags = document.querySelectorAll('.filter-tag');
const keywordTags = document.querySelectorAll('.keyword-tag');
const diseaseCount = document.getElementById('diseaseCount');
const favoritesCount = document.getElementById('favoritesCount');
const compareCount = document.getElementById('compareCount');
const imageCount = document.getElementById('imageCount');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const backToTopBtn = document.getElementById('backToTop');
const compareToolbar = document.getElementById('compareToolbar');
const compareList = document.getElementById('compareList');
const clearCompareBtn = document.getElementById('clearCompare');
const startCompareBtn = document.getElementById('startCompare');
const favoritesLink = document.getElementById('favoritesLink');
const lastUpdatedEl = document.getElementById('lastUpdated');
const filterTrigger = document.getElementById('filterTrigger');
const filterOverlay = document.getElementById('filterOverlay');
const filterClose = document.getElementById('filterClose');
const severityTags = document.querySelectorAll('.severity-tag');
const cropTags = document.querySelectorAll('.crop-tag');
const pathogenTags = document.querySelectorAll('.pathogen-tag');
const conditionTags = document.querySelectorAll('.condition-tag');
const applyFilterBtn = document.getElementById('applyFilter');
const resetFilterBtn = document.getElementById('resetFilter');
const filteredCount = document.getElementById('filteredCount');
const currentFiltersEl = document.getElementById('currentFilters');
const filterStatus = document.getElementById('filterStatus');
const imageGalleryTrigger = document.getElementById('imageGalleryTrigger');
const imageGalleryModal = document.getElementById('imageGalleryModal');
const imageViewerModal = document.getElementById('imageViewerModal');
const viewAllImagesBtn = document.getElementById('viewAllImages');
const searchByImageBtn = document.getElementById('searchByImage');
const imageQuickAccess = document.getElementById('imageQuickAccess');

// 全局状态
let currentFilter = 'all';
let currentSearch = '';
let searchTimeout;
let observer;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);

// 异步加载JSON数据
async function loadDiseasesData() {
    try {
        const response = await fetch('diseases.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('从JSON加载的数据:', data);
        
        diseasesData = data.diseases || [];
        
        // 更新页面统计
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = data.last_updated || new Date().toLocaleDateString();
        }
        
        return diseasesData;
    } catch (error) {
        console.error('加载病害数据失败:', error);
        // 使用备用数据
        diseasesData = getFallbackData();
        return diseasesData;
    }
}

// 加载图像数据
async function loadImagesData() {
    try {
        const response = await fetch('images/frontend_images.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        imagesData = data;
        filteredImages = [...data.images];
        
        // 更新图像统计
        if (imageCount) {
            imageCount.textContent = data.images.length;
        }
        
        console.log(`✅ 加载了 ${data.images.length} 张病害图像`);
        
        // 更新快速访问区域
        updateImageQuickAccess();
        
        return data;
    } catch (error) {
        console.error('加载图像数据失败:', error);
        
        // 使用备用数据
        imagesData = getFallbackImageData();
        filteredImages = [...imagesData.images];
        
        if (imageCount) {
            imageCount.textContent = imagesData.images.length;
        }
        
        updateImageQuickAccess();
        
        return imagesData;
    }
}

// 更新图像快速访问区域
function updateImageQuickAccess() {
    if (!imagesData || !imageQuickAccess) return;
    
    // 获取热门图像（每种作物取前3张）
    const crops = [...new Set(imagesData.images.map(img => img.crop))];
    let hotImages = [];
    
    crops.forEach(crop => {
        const cropImages = imagesData.images.filter(img => img.crop === crop && !img.is_healthy);
        const selectedImages = cropImages.slice(0, Math.min(3, cropImages.length));
        hotImages.push(...selectedImages);
    });
    
    // 确保不超过12张
    hotImages = hotImages.slice(0, 12);
    
    const html = hotImages.map(img => `
        <div class="quick-access-item" onclick="openImage(${img.id})">
            <div class="quick-access-image">
                <img src="${img.thumbnail}" 
                     alt="${img.crop} - ${img.disease}"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/150/4CAF50/FFFFFF?text=${encodeURIComponent(img.crop)}'">
                <div class="quick-access-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <div class="quick-access-info">
                <div class="quick-access-crop">${img.crop}</div>
                <div class="quick-access-disease">${img.disease}</div>
            </div>
        </div>
    `).join('');
    
    imageQuickAccess.innerHTML = html;
}

// 备用图像数据
function getFallbackImageData() {
    return {
        images: [
            {
                id: 1,
                crop: '番茄',
                disease: '早疫病',
                thumbnail: 'https://via.placeholder.com/200/FF5722/FFFFFF?text=番茄早疫病',
                preview: 'https://via.placeholder.com/800/FF5722/FFFFFF?text=番茄早疫病',
                is_healthy: false,
                type: '真菌'
            },
            {
                id: 2,
                crop: '番茄',
                disease: '晚疫病',
                thumbnail: 'https://via.placeholder.com/200/FF9800/FFFFFF?text=番茄晚疫病',
                preview: 'https://via.placeholder.com/800/FF9800/FFFFFF?text=番茄晚疫病',
                is_healthy: false,
                type: '真菌'
            },
            {
                id: 3,
                crop: '番茄',
                disease: '叶霉病',
                thumbnail: 'https://via.placeholder.com/200/4CAF50/FFFFFF?text=番茄叶霉病',
                preview: 'https://via.placeholder.com/800/4CAF50/FFFFFF?text=番茄叶霉病',
                is_healthy: false,
                type: '真菌'
            },
            {
                id: 4,
                crop: '玉米',
                disease: '大斑病',
                thumbnail: 'https://via.placeholder.com/200/2196F3/FFFFFF?text=玉米大斑病',
                preview: 'https://via.placeholder.com/800/2196F3/FFFFFF?text=玉米大斑病',
                is_healthy: false,
                type: '真菌'
            },
            {
                id: 5,
                crop: '水稻',
                disease: '稻瘟病',
                thumbnail: 'https://via.placeholder.com/200/9C27B0/FFFFFF?text=水稻稻瘟病',
                preview: 'https://via.placeholder.com/800/9C27B0/FFFFFF?text=水稻稻瘟病',
                is_healthy: false,
                type: '真菌'
            },
            {
                id: 6,
                crop: '小麦',
                disease: '赤霉病',
                thumbnail: 'https://via.placeholder.com/200/795548/FFFFFF?text=小麦赤霉病',
                preview: 'https://via.placeholder.com/800/795548/FFFFFF?text=小麦赤霉病',
                is_healthy: false,
                type: '真菌'
            }
        ],
        crops: ['番茄', '玉米', '水稻', '小麦', '黄瓜', '马铃薯'],
        diseases: ['早疫病', '晚疫病', '叶霉病', '大斑病', '稻瘟病', '赤霉病']
    };
}

// 备用数据（简化的原数据）
function getFallbackData() {
    return [
         {
      "id": 1,
      "name": "苹果黑星病",
      "crop": "苹果",
      "pathogen": "苹果黑星病菌 (Venturia inaequalis)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现橄榄绿至黑色霉层，病斑边缘模糊，后期叶片扭曲变形。果实上形成黑色硬痂，表面粗糙，严重影响商品价值。",
      "symptoms_detail": {
        "叶片症状": ["黑色霉层", "叶片扭曲", "早期落叶"],
        "果实症状": ["黑色硬痂", "果皮粗糙", "果实畸形"],
        "嫩枝症状": ["褐色病斑", "表皮开裂"]
      },
      "prevention": "1. 选用抗病品种；2. 冬季清园，清除病残体；3. 合理修剪，改善通风透光；4. 萌芽前喷施石硫合剂；5. 生长期及时喷药防治。",
      "agricultural_control": [
        "冬季彻底清园，清除落叶、落果",
        "合理修剪，保持树冠通风透光",
        "平衡施肥，增强树势",
        "及时排水，降低果园湿度"
      ],
      "pesticides": [
        { 
          "name": "苯醚甲环唑", 
          "concentration": "2000-3000倍液", 
          "safety": "21天", 
          "stage": ["花蕾期", "落花期", "幼果期"],
          "precautions": ["轮换使用", "避免高温喷药"]
        },
        { 
          "name": "戊唑醇", 
          "concentration": "1500-2000倍液", 
          "safety": "28天", 
          "stage": ["发病初期", "雨前预防"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "94%",
      "references": "《苹果病害诊断与防治》、《果树病理学》",
      "growth_stages": ["萌芽期", "花期", "幼果期", "果实膨大期"],
      "weather_conditions": ["凉爽湿润", "多雨季节"],
      "optimal_temperature": "17-23℃",
      "optimal_humidity": "相对湿度70%以上",
      "conditions": ["春季多雨", "果园郁闭", "树势衰弱", "连阴天气"],
      "related_diseases": [2, 3],
      "project_features": ["黑色霉层识别", "病斑边缘检测", "叶片变形分析"],
      "tags": ["真菌病害", "果实病害", "高危害", "苹果主要病害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B4513/FFFFFF?text=苹果黑星病"
      }
    },
    {
      "id": 2,
      "name": "黑腐病",
      "crop": "苹果",
      "pathogen": "苹果黑腐病菌 (Botryosphaeria obtusa)",
      "pathogen_type": "真菌",
      "symptoms": "果实出现褐色圆形病斑，中心凹陷，后期产生黑色小粒点（分生孢子器）。叶片出现褐色坏死斑，枝条产生溃疡。",
      "prevention": "1. 加强果园管理，增强树势；2. 及时清除病果、病枝；3. 合理修剪；4. 果实套袋；5. 药剂防治。",
      "agricultural_control": [
        "冬季清园，烧毁病残体",
        "合理修剪，剪除病枝",
        "果实套袋保护",
        "避免机械损伤"
      ],
      "pesticides": [
        { 
          "name": "甲基硫菌灵", 
          "concentration": "800-1000倍液", 
          "safety": "14天", 
          "stage": ["发病初期", "雨季前"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "91%",
      "references": "《苹果病虫害防治手册》",
      "conditions": ["高温高湿", "树势衰弱", "果实伤口"],
      "tags": ["真菌病害", "果实病害", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B4513/FFFFFF?text=苹果黑腐病"
      }
    },
    {
      "id": 3,
      "name": "苹果锈病",
      "crop": "苹果",
      "pathogen": "山田胶锈菌 (Gymnosporangium yamadae)",
      "pathogen_type": "真菌",
      "symptoms": "叶片正面出现橙黄色圆形病斑，背面隆起产生毛状物（锈孢子器）。果实、嫩梢也可受害。需转主寄主（桧柏）完成生活史。",
      "prevention": "1. 清除果园周围桧柏等转主寄主；2. 春季喷药保护；3. 选用抗病品种；4. 加强栽培管理。",
      "agricultural_control": [
        "清除果园周围5公里内桧柏",
        "春季在桧柏上喷药",
        "合理施肥，增强抗性"
      ],
      "pesticides": [
        { 
          "name": "三唑酮", 
          "concentration": "1000-1500倍液", 
          "safety": "21天", 
          "stage": ["展叶期", "花后"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "93%",
      "references": "《苹果锈病防治技术》",
      "conditions": ["春季多雨", "有转主寄主", "果园通风不良"],
      "tags": ["真菌病害", "转主寄生", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FFA500/FFFFFF?text=苹果锈病"
      }
    },
        {
      "id": 4,
      "name": "灰斑病",
      "crop": "玉米",
      "pathogen": "玉米尾孢菌 (Cercospora zeae-maydis)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现椭圆形或长圆形灰色病斑，边缘褐色。严重时病斑连片，叶片枯死，影响光合作用。",
      "prevention": "1. 选用抗病品种；2. 合理密植；3. 轮作倒茬；4. 清除病残体；5. 药剂防治。",
      "agricultural_control": [
        "与豆类、薯类作物轮作",
        "适期播种，合理密植",
        "科学施肥，增施磷钾肥"
      ],
      "pesticides": [
        { 
          "name": "代森锰锌", 
          "concentration": "500-800倍液", 
          "safety": "7天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "90%",
      "references": "《玉米病害诊断图谱》",
      "conditions": ["高温高湿", "连作地块", "密植"],
      "tags": ["真菌病害", "叶部病害", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/808080/FFFFFF?text=玉米灰斑病"
      }
    },
        {
      "id": 5,
      "name": "普通锈病",
      "crop": "玉米",
      "pathogen": "玉米柄锈菌 (Puccinia sorghi)",
      "pathogen_type": "真菌",
      "symptoms": "叶片两面产生黄褐色夏孢子堆，表皮破裂后散出锈褐色粉末。后期产生黑色冬孢子堆。",
      "prevention": "1. 选用抗病品种；2. 合理密植；3. 科学施肥；4. 药剂防治。",
      "agricultural_control": [
        "种植抗病品种",
        "避免偏施氮肥",
        "及时中耕除草"
      ],
      "pesticides": [
        { 
          "name": "戊唑醇", 
          "concentration": "1500-2000倍液", 
          "safety": "21天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "92%",
      "references": "《玉米锈病防治》",
      "conditions": ["温暖湿润", "昼夜温差大", "结露"],
      "tags": ["真菌病害", "锈病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B4513/FFFFFF?text=玉米普通锈病"
      }
    },
      {
      "id": 6,
      "name": "北方叶枯病",
      "crop": "玉米",
      "pathogen": "玉米离蠕孢菌 (Bipolaris zeicola)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现椭圆形或纺锤形病斑，中央灰白色，边缘紫褐色。严重时叶片干枯，影响产量。",
      "prevention": "1. 选用抗病品种；2. 轮作倒茬；3. 及时清除病残体；4. 药剂拌种；5. 生长期喷药。",
      "agricultural_control": [
        "与非禾本科作物轮作",
        "深耕灭茬，减少菌源",
        "适期晚播，避开雨季"
      ],
      "pesticides": [
        { 
          "name": "苯醚甲环唑", 
          "concentration": "2000-3000倍液", 
          "safety": "21天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "89%",
      "references": "《玉米叶部病害防治》",
      "conditions": ["凉爽多雨", "连作", "植株生长后期"],
      "tags": ["真菌病害", "叶枯病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/2E8B57/FFFFFF?text=玉米北方叶枯病"
      }
    },
     {
      "id": 7,
      "name": "黑腐病",
      "crop": "葡萄",
      "pathogen": "葡萄黑腐病菌 (Guignardia bidwellii)",
      "pathogen_type": "真菌",
      "symptoms": "果粒出现褐色小斑点，后扩大为黑褐色凹陷病斑，表面产生黑色小粒点。叶片出现红褐色不规则病斑。",
      "prevention": "1. 冬季清园；2. 加强栽培管理；3. 果穗套袋；4. 药剂防治。",
      "agricultural_control": [
        "冬季彻底清园，清除病果病叶",
        "合理修剪，改善通风透光",
        "果穗套袋"
      ],
      "pesticides": [
        { 
          "name": "嘧菌酯", 
          "concentration": "1000-1500倍液", 
          "safety": "14天", 
          "stage": ["花前", "花后", "果实膨大期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "93%",
      "references": "《葡萄病害防治技术》",
      "conditions": ["高温高湿", "果园郁闭", "果实近成熟期"],
      "tags": ["真菌病害", "果实病害", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/4B0082/FFFFFF?text=葡萄黑腐病"
      }
    },
        {
      "id": 8,
      "name": "黑麻疹病",
      "crop": "葡萄",
      "pathogen": "葡萄痂囊腔菌 (Elsinoe ampelina)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现褐色坏死斑，边缘暗褐色。果实表面产生褐色粗糙痂斑，呈\"鸟眼\"状。",
      "prevention": "1. 选用无病苗木；2. 冬季清园；3. 加强管理；4. 药剂防治。",
      "agricultural_control": [
        "使用无病苗木",
        "冬季清园，清除病残体",
        "合理施肥，增强树势"
      ],
      "pesticides": [
        { 
          "name": "甲基硫菌灵", 
          "concentration": "800-1000倍液", 
          "safety": "14天", 
          "stage": ["萌芽期", "展叶期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "91%",
      "references": "《葡萄黑麻疹病诊断》",
      "conditions": ["多雨潮湿", "果园排水不良", "伤口"],
      "tags": ["真菌病害", "疮痂病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B0000/FFFFFF?text=葡萄黑麻疹病"
      }
    },
    {
      "id": 9,
      "name": "叶枯病",
      "crop": "葡萄",
      "pathogen": "葡萄生叶点霉 (Phyllosticta viticola)",
      "pathogen_type": "真菌",
      "symptoms": "叶片边缘出现褐色不规则病斑，病健交界处有黄色晕圈。后期病斑干枯，叶片提前脱落。",
      "prevention": "1. 加强栽培管理；2. 合理修剪；3. 及时排水；4. 药剂防治。",
      "agricultural_control": [
        "合理修剪，保持通风透光",
        "及时排水，降低湿度",
        "增施有机肥"
      ],
      "pesticides": [
        { 
          "name": "百菌清", 
          "concentration": "600倍液", 
          "safety": "10天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "low",
      "recognition_accuracy": "90%",
      "references": "《葡萄叶部病害》",
      "conditions": ["多雨季节", "果园郁闭", "树势衰弱"],
      "tags": ["真菌病害", "叶部病害", "低危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/556B2F/FFFFFF?text=葡萄叶枯病"
      }
    },
     {
      "id": 10,
      "name": "细菌性斑点病",
      "crop": "甜椒",
      "pathogen": "野油菜黄单胞菌辣椒斑点病致病变种 (Xanthomonas campestris pv. vesicatoria)",
      "pathogen_type": "细菌",
      "symptoms": "叶片出现水渍状小斑点，后发展为褐色坏死斑，周围有黄色晕圈。果实上产生隆起的小疱斑。",
      "prevention": "1. 选用抗病品种；2. 种子消毒；3. 轮作倒茬；4. 避免伤口；5. 药剂防治。",
      "agricultural_control": [
        "种子用55℃温水浸种30分钟",
        "与非茄科作物轮作3年以上",
        "避免在雨天进行农事操作"
      ],
      "pesticides": [
        { 
          "name": "春雷霉素", 
          "concentration": "500-600倍液", 
          "safety": "7天", 
          "stage": ["发病初期"]
        },
        { 
          "name": "氢氧化铜", 
          "concentration": "800-1000倍液", 
          "safety": "10天", 
          "stage": ["预防期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "92%",
      "references": "《辣椒病害诊断与防治》",
      "conditions": ["高温高湿", "暴风雨", "植株伤口多"],
      "tags": ["细菌病害", "斑点病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FF0000/FFFFFF?text=甜椒细菌性斑点病"
      }
    },
    {
      "id": 11,
      "name": "早疫病",
      "crop": "马铃薯",
      "pathogen": "茄链格孢菌 (Alternaria solani)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现深褐色圆形病斑，有明显同心轮纹。块茎上产生褐色凹陷病斑，皮下组织变褐。",
      "prevention": "1. 选用抗病品种；2. 轮作倒茬；3. 加强栽培管理；4. 药剂防治。",
      "agricultural_control": [
        "与非茄科作物轮作3年以上",
        "选用无病种薯",
        "高垄栽培，及时排水"
      ],
      "pesticides": [
        { 
          "name": "代森锰锌", 
          "concentration": "500-800倍液", 
          "safety": "7天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "95%",
      "references": "《马铃薯病害防治》",
      "conditions": ["温暖多雨", "昼夜温差大", "结露"],
      "tags": ["真菌病害", "叶部病害", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B7355/FFFFFF?text=马铃薯早疫病"
      }
    },
    {
      "id": 12,
      "name": "晚疫病",
      "crop": "马铃薯",
      "pathogen": "致病疫霉菌 (Phytophthora infestans)",
      "pathogen_type": "真菌",
      "symptoms": "叶片边缘出现水渍状暗绿色病斑，湿度大时产生白色霉层。块茎上产生褐色病斑，切开可见锈褐色坏死。",
      "prevention": "1. 选用抗病品种；2. 种薯处理；3. 加强预报；4. 药剂防治。",
      "agricultural_control": [
        "选用抗病品种",
        "种薯用草木灰拌种",
        "及时拔除中心病株"
      ],
      "pesticides": [
        { 
          "name": "烯酰吗啉", 
          "concentration": "1500-2000倍液", 
          "safety": "3天", 
          "stage": ["发病初期", "预防期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "96%",
      "references": "《马铃薯晚疫病防治技术》",
      "conditions": ["低温高湿", "连续阴雨", "结露"],
      "tags": ["真菌病害", "流行性病害", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/808080/FFFFFF?text=马铃薯晚疫病"
      }
    },
    {
      "id": 13,
      "name": "细菌性斑点病",
      "crop": "番茄",
      "pathogen": "丁香假单胞菌番茄致病变种 (Pseudomonas syringae pv. tomato)",
      "pathogen_type": "细菌",
      "symptoms": "叶片出现深褐色至黑色小斑点，周围有黄色晕圈。茎秆和果实上也可产生类似病斑。",
      "prevention": "1. 选用抗病品种；2. 种子消毒；3. 轮作倒茬；4. 避免伤口；5. 药剂防治。",
      "agricultural_control": [
        "种子用1%次氯酸钠消毒",
        "与非茄科作物轮作",
        "避免在露水未干时操作"
      ],
      "pesticides": [
        { 
          "name": "春雷霉素", 
          "concentration": "500-600倍液", 
          "safety": "7天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "93%",
      "references": "《番茄细菌性病害防治》",
      "conditions": ["温暖湿润", "暴风雨", "植株伤口"],
      "tags": ["细菌病害", "斑点病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FF6347/FFFFFF?text=番茄细菌性斑点病"
      }
    },
     {
      "id": 14,
      "name": "早疫病",
      "crop": "番茄",
      "pathogen": "茄链格孢菌 (Alternaria solani)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现深褐色圆形或不规则形病斑，有明显同心轮纹。果实上产生黑色凹陷病斑。",
      "prevention": "1. 选用抗病品种；2. 轮作倒茬；3. 加强管理；4. 药剂防治。",
      "agricultural_control": [
        "与非茄科作物轮作3年以上",
        "及时摘除病叶病果",
        "合理密植，保证通风"
      ],
      "pesticides": [
        { 
          "name": "代森锰锌", 
          "concentration": "500-800倍液", 
          "safety": "7天", 
          "stage": ["发病初期", "预防期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "94%",
      "references": "《番茄早疫病防治》",
      "conditions": ["高温高湿", "昼夜温差大", "结露"],
      "tags": ["真菌病害", "叶部病害", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FF4500/FFFFFF?text=番茄早疫病"
      }
    },
    {
      "id": 15,
      "name": "晚疫病",
      "crop": "番茄",
      "pathogen": "致病疫霉菌 (Phytophthora infestans)",
      "pathogen_type": "真菌",
      "symptoms": "叶片边缘出现水渍状暗绿色病斑，湿度大时产生白色霉层。果实上产生褐色不规则病斑，质地坚硬。",
      "prevention": "1. 选用抗病品种；2. 加强预报；3. 合理密植；4. 药剂防治。",
      "agricultural_control": [
        "高畦栽培，及时排水",
        "合理密植，保证通风",
        "及时摘除病叶病果"
      ],
      "pesticides": [
        { 
          "name": "烯酰吗啉", 
          "concentration": "1500-2000倍液", 
          "safety": "3天", 
          "stage": ["发病初期", "预防期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "95%",
      "references": "《番茄晚疫病综合防治》",
      "conditions": ["低温高湿", "连续阴雨", "结露时间长"],
      "tags": ["真菌病害", "流行性病害", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B0000/FFFFFF?text=番茄晚疫病"
      }
    },
    {
      "id": 16,
      "name": "叶霉病",
      "crop": "番茄",
      "pathogen": "褐孢霉 (Fulvia fulva)",
      "pathogen_type": "真菌",
      "symptoms": "叶片正面出现黄绿色病斑，背面产生灰紫色至黑褐色霉层。严重时叶片卷曲干枯。",
      "prevention": "1. 选用抗病品种；2. 合理密植；3. 控制湿度；4. 药剂防治。",
      "agricultural_control": [
        "合理密植，改善通风透光",
        "控制浇水，降低湿度",
        "及时摘除病叶"
      ],
      "pesticides": [
        { 
          "name": "春雷霉素", 
          "concentration": "500-600倍液", 
          "safety": "7天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "92%",
      "references": "《番茄叶霉病防治技术》",
      "conditions": ["高温高湿", "光照不足", "通风不良"],
      "tags": ["真菌病害", "叶部病害", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/32CD32/FFFFFF?text=番茄叶霉病"
      }
    },
    {
      "id": 17,
      "name": "叶斑病",
      "crop": "番茄",
      "pathogen": "番茄壳针孢菌 (Septoria lycopersici)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现圆形或近圆形小斑点，中央灰白色，边缘褐色，病斑上散生黑色小粒点。",
      "prevention": "1. 选用抗病品种；2. 轮作倒茬；3. 清除病残体；4. 药剂防治。",
      "agricultural_control": [
        "与非茄科作物轮作",
        "及时清除病叶",
        "避免过度密植"
      ],
      "pesticides": [
        { 
          "name": "百菌清", 
          "concentration": "600倍液", 
          "safety": "10天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "91%",
      "references": "《番茄叶斑病诊断》",
      "conditions": ["温暖多雨", "植株过密", "田间湿度大"],
      "tags": ["真菌病害", "叶斑病", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/228B22/FFFFFF?text=番茄叶斑病"
      }
    },
     {
      "id": 18,
      "name": "红蜘蛛（二斑叶螨）",
      "crop": "番茄",
      "pathogen": "二斑叶螨 (Tetranychus urticae)",
      "pathogen_type": "虫害",
      "symptoms": "叶片正面出现黄色小斑点，背面可见红色小螨虫及丝网。严重时叶片变黄、干枯脱落。",
      "prevention": "1. 清除杂草；2. 合理灌溉；3. 保护天敌；4. 药剂防治。",
      "agricultural_control": [
        "及时清除田间杂草",
        "合理灌溉，避免干旱",
        "保护捕食螨等天敌"
      ],
      "pesticides": [
        { 
          "name": "阿维菌素", 
          "concentration": "3000-5000倍液", 
          "safety": "7天", 
          "stage": ["发生初期"]
        },
        { 
          "name": "哒螨灵", 
          "concentration": "2000-3000倍液", 
          "safety": "14天", 
          "stage": ["发生盛期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "93%",
      "references": "《番茄虫害防治》",
      "conditions": ["高温干燥", "通风不良", "植株过密"],
      "tags": ["虫害", "螨类", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FF0000/FFFFFF?text=番茄红蜘蛛"
      }
    },
        {
      "id": 19,
      "name": "靶斑病",
      "crop": "番茄",
      "pathogen": "棒孢霉菌 (Corynespora cassiicola)",
      "pathogen_type": "真菌",
      "symptoms": "叶片出现圆形或不规则形病斑，病斑中央灰白色，边缘褐色，呈\"靶心\"状。果实上产生黑色凹陷病斑。",
      "prevention": "1. 选用抗病品种；2. 轮作倒茬；3. 加强管理；4. 药剂防治。",
      "agricultural_control": [
        "与非茄科作物轮作",
        "及时摘除病叶",
        "合理施肥，增强抗性"
      ],
      "pesticides": [
        { 
          "name": "苯醚甲环唑", 
          "concentration": "2000-3000倍液", 
          "safety": "21天", 
          "stage": ["发病初期"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "92%",
      "references": "《番茄靶斑病防治技术》",
      "conditions": ["高温高湿", "连作", "植株生长过旺"],
      "tags": ["真菌病害", "靶斑病", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/8B4513/FFFFFF?text=番茄靶斑病"
      }
    },
     {
      "id": 20,
      "name": "花叶病毒病",
      "crop": "番茄",
      "pathogen": "烟草花叶病毒 (Tobacco mosaic virus, TMV)",
      "pathogen_type": "病毒",
      "symptoms": "叶片出现黄绿相间的花叶症状，叶片皱缩、畸形。植株矮化，果实变小、畸形。",
      "prevention": "1. 选用抗病品种；2. 种子消毒；3. 农事操作消毒；4. 防治蚜虫；5. 早期拔除病株。",
      "agricultural_control": [
        "种子用10%磷酸三钠浸种20分钟",
        "农事操作前后用肥皂水洗手",
        "早期拔除病株"
      ],
      "pesticides": [
        { 
          "name": "宁南霉素", 
          "concentration": "500-800倍液", 
          "safety": "7天", 
          "stage": ["苗期", "发病初期"]
        }
      ],
      "severity": "medium",
      "recognition_accuracy": "90%",
      "references": "《番茄病毒病防治》",
      "conditions": ["高温干旱", "蚜虫多发", "机械传毒"],
      "tags": ["病毒病害", "系统侵染", "中危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FFFF00/000000?text=番茄花叶病毒病"
      }
    },
     {
      "id": 21,
      "name": "黄化曲叶病毒病",
      "crop": "番茄",
      "pathogen": "番茄黄化曲叶病毒 (Tomato yellow leaf curl virus, TYLCV)",
      "pathogen_type": "病毒",
      "symptoms": "叶片边缘黄化、上卷，叶片变小、变厚、变脆。植株严重矮化，开花结果少，果实变小。",
      "prevention": "1. 选用抗病品种；2. 防虫网覆盖；3. 防治烟粉虱；4. 早期拔除病株。",
      "agricultural_control": [
        "苗期覆盖防虫网",
        "及时防治烟粉虱",
        "拔除病株并销毁"
      ],
      "pesticides": [
        { 
          "name": "噻虫嗪", 
          "concentration": "3000-5000倍液", 
          "safety": "7天", 
          "stage": ["苗期", "定植前"]
        }
      ],
      "severity": "high",
      "recognition_accuracy": "94%",
      "references": "《番茄黄化曲叶病毒病综合防治》",
      "conditions": ["高温干旱", "烟粉虱发生重", "连作"],
      "tags": ["病毒病害", "系统侵染", "高危害"],
      "images": {
        "main": "https://via.placeholder.com/400x300/FFD700/000000?text=番茄黄化曲叶病毒病"
      }
    }
    ];
}

// 初始化模糊搜索
function initFuzzySearch() {
    if (typeof Fuse === 'undefined') {
        console.warn('Fuse.js 未加载，使用基础搜索');
        return;
    }
    
    const options = {
        keys: [
            { name: 'name', weight: 2 },
            { name: 'crop', weight: 1.5 },
            { name: 'pathogen', weight: 1.2 },
            { name: 'symptoms', weight: 1 },
            { name: 'pathogen_type', weight: 0.8 },
            { name: 'tags', weight: 0.5 },
            { name: 'prevention', weight: 0.3 },
            { name: 'pesticides.name', weight: 0.7 }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2,
        shouldSort: true,
        findAllMatches: true
    };
    
    fuseInstance = new Fuse(diseasesData, options);
    console.log('Fuse.js 模糊搜索初始化完成');
}

// 增强的搜索函数
function enhancedSearch(searchTerm) {
    if (!searchTerm.trim()) {
        return diseasesData;
    }
    
    // 如果 Fuse.js 可用，使用模糊搜索
    if (fuseInstance) {
        const results = fuseInstance.search(searchTerm);
        return results.map(result => result.item);
    }
    
    // 否则使用原有的精确搜索
    const lowerTerm = searchTerm.toLowerCase();
    return diseasesData.filter(disease => {
        return (
             disease.name.toLowerCase().includes(lowerTerm) ||
            disease.crop.toLowerCase().includes(lowerTerm) ||
            disease.pathogen.toLowerCase().includes(lowerTerm) ||
            disease.symptoms.toLowerCase().includes(lowerTerm) ||
            (disease.pathogen_type && disease.pathogen_type.toLowerCase().includes(lowerTerm)) ||
            (disease.tags && disease.tags.some(tag => tag.toLowerCase().includes(lowerTerm))) ||
            (disease.pesticides && disease.pesticides.some(p => p.name.toLowerCase().includes(lowerTerm))) ||
            (disease.prevention && disease.prevention.toLowerCase().includes(lowerTerm))
        );
    });
}

async function initPage() {
    console.log('开始初始化页面...');
    
    // 加载病害数据
    const loadedData = await loadDiseasesData();
    console.log('成功加载病害数据，数量:', diseasesData.length);
    
    // 加载图像数据
    await loadImagesData();
    
    // 初始化模糊搜索
    initFuzzySearch();
    
    // 确保 filteredDiseases 包含所有数据
    filteredDiseases = [...diseasesData];
    console.log('filteredDiseases 数量:', filteredDiseases.length);
    
    // 初始化状态显示
    updateFavoritesCount();
    updateCompareCount();
    
    // 初始化筛选状态显示
    updateFilterStatus();
    if (filteredCount) {
        filteredCount.textContent = diseasesData.length;
    }

    // 渲染所有病害卡片
    renderDiseases(filteredDiseases);
    
    // 更新页面统计
    if (diseaseCount) {
        diseaseCount.textContent = diseasesData.length;
        console.log('页面显示病害数量:', diseaseCount.textContent);
    }
    
    // 初始化筛选标签状态
    initFilterTags();
    
    // 初始化图片懒加载观察器
    initLazyLoadObserver();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 更新对比工具栏
    updateCompareToolbar();
    
    // 初始化图像库
    initImageLibrary();
    
    // 加载完成
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    }, 800);
}

// 初始化图像库
function initImageLibrary() {
    // 填充筛选器
    populateImageFilters();
    
    // 初始渲染
    renderImageGallery();
    updateImageStats();
}

// 填充图像筛选器
function populateImageFilters() {
    if (!imagesData) return;
    
    // 填充作物筛选
    const cropSelect = document.getElementById('filterCrop');
    if (cropSelect) {
        cropSelect.innerHTML = '<option value="all">全部作物</option>';
        imagesData.crops.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop;
            cropSelect.appendChild(option);
        });
    }
    
    // 填充病害筛选
    const diseaseSelect = document.getElementById('filterDisease');
    if (diseaseSelect) {
        diseaseSelect.innerHTML = '<option value="all">全部病害</option>';
        const diseases = [...new Set(imagesData.images.map(img => img.disease))];
        diseases.forEach(disease => {
            const option = document.createElement('option');
            option.value = disease;
            option.textContent = disease;
            diseaseSelect.appendChild(option);
        });
    }
}

// 渲染图像图库
function renderImageGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid || !imagesData) return;
    
    const startIndex = (currentImagePage - 1) * CONFIG.IMAGES_PER_PAGE;
    const endIndex = startIndex + CONFIG.IMAGES_PER_PAGE;
    const pageImages = filteredImages.slice(startIndex, endIndex);
    
    // 生成HTML
    const html = pageImages.map(image => {
        const isSelected = selectedImageIds.has(image.id);
        const healthClass = image.is_healthy ? 'healthy' : 'diseased';
        const typeClass = image.type === '健康' ? 'type-healthy' : `type-${image.type}`;
        
        return `
            <div class="gallery-item ${isSelected ? 'selected' : ''}" 
                 data-id="${image.id}" 
                 data-crop="${image.crop}"
                 data-disease="${image.disease}">
                <div class="gallery-item-select">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                           onchange="toggleImageSelect(${image.id})">
                </div>
                <div class="gallery-item-image" onclick="openImage(${image.id})">
                    <img src="${image.thumbnail}" 
                         alt="${image.crop} - ${image.disease}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/200x200/f0f0f0/666?text=图像加载失败'">
                    <div class="image-overlay">
                        <i class="fas fa-search-plus"></i>
                        <span>点击查看大图</span>
                    </div>
                </div>
                <div class="gallery-item-info">
                    <div class="item-crop">${image.crop}</div>
                    <div class="item-disease ${healthClass}">${image.disease}</div>
                    <div class="item-type ${typeClass}">${image.type}</div>
                    <div class="item-actions">
                        <button class="btn-small" onclick="event.stopPropagation(); openImage(${image.id})">
                            <i class="fas fa-eye"></i> 查看
                        </button>
                        <button class="btn-small" onclick="event.stopPropagation(); compareImage(${image.id})">
                            <i class="fas fa-balance-scale"></i> 对比
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    galleryGrid.innerHTML = html || `
        <div class="no-images">
            <i class="fas fa-search"></i>
            <h3>未找到符合条件的图像</h3>
            <p>请尝试其他筛选条件</p>
        </div>
    `;
    
    renderImagePagination();
}

// 渲染图像分页
function renderImagePagination() {
    const totalPages = Math.ceil(filteredImages.length / CONFIG.IMAGES_PER_PAGE);
    const paginationEl = document.getElementById('galleryPagination');
    
    if (!paginationEl || totalPages <= 1) {
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }
    
    let html = `<div class="pagination">`;
    
    // 上一页按钮
    html += `<button class="pagination-btn ${currentImagePage === 1 ? 'disabled' : ''}" 
                     onclick="changeImagePage(${currentImagePage - 1})">
                <i class="fas fa-chevron-left"></i>
             </button>`;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentImagePage) <= 2) {
            html += `<button class="pagination-btn ${i === currentImagePage ? 'active' : ''}" 
                             onclick="changeImagePage(${i})">
                        ${i}
                     </button>`;
        } else if (Math.abs(i - currentImagePage) === 3) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // 下一页按钮
    html += `<button class="pagination-btn ${currentImagePage === totalPages ? 'disabled' : ''}" 
                     onclick="changeImagePage(${currentImagePage + 1})">
                <i class="fas fa-chevron-right"></i>
             </button>`;
    
    html += `</div>`;
    
    paginationEl.innerHTML = html;
}

// 更新图像统计
function updateImageStats() {
    const totalEl = document.getElementById('totalImages');
    const filteredEl = document.getElementById('filteredImages');
    const selectedEl = document.getElementById('selectedImages');
    
    if (totalEl) totalEl.textContent = imagesData?.images.length || 0;
    if (filteredEl) filteredEl.textContent = filteredImages.length;
    if (selectedEl) selectedEl.textContent = selectedImageIds.size;
}

// 打开图像
function openImage(imageId) {
    if (!imagesData) return;
    
    const image = imagesData.images.find(img => img.id === imageId);
    if (!image) return;
    
    currentImageIndex = filteredImages.findIndex(img => img.id === imageId);
    currentZoom = 1;
    
    // 更新UI
    document.getElementById('imageTitle').textContent = `${image.crop} - ${image.disease}`;
    document.getElementById('infoCrop').textContent = image.crop;
    document.getElementById('infoDisease').textContent = image.disease;
    document.getElementById('infoType').textContent = image.type;
    document.getElementById('infoHealth').textContent = image.is_healthy ? '健康' : '患病';
    document.getElementById('infoHealth').className = `health-status ${image.is_healthy ? 'healthy' : 'diseased'}`;
    document.getElementById('infoId').textContent = image.id;
    
    // 更新识别特征
    const featuresEl = document.getElementById('recognitionFeatures');
    if (featuresEl) {
        featuresEl.innerHTML = `
            <ul>
                <li>病斑形状: ${getRandomFeature('形状')}</li>
                <li>病斑颜色: ${getRandomFeature('颜色')}</li>
                <li>分布特点: ${getRandomFeature('分布')}</li>
                <li>边缘特征: ${getRandomFeature('边缘')}</li>
            </ul>
        `;
    }
    
    // 更新图像计数
    updateImageCounter();
    
    // 显示加载状态
    const loadingEl = document.getElementById('imageLoading');
    const currentImageView = document.getElementById('currentImageView');
    
    if (loadingEl) loadingEl.style.display = 'flex';
    if (currentImageView) currentImageView.style.opacity = '0';
    
    // 加载图像
    if (currentImageView) {
        currentImageView.src = image.preview || image.thumbnail;
        currentImageView.alt = `${image.crop} - ${image.disease}`;
        
        // 图像加载完成
        currentImageView.onload = () => {
            if (loadingEl) loadingEl.style.display = 'none';
            currentImageView.style.opacity = '1';
            setImageZoom(currentZoom);
        };
    }
    
    // 加载缩略图条
    renderThumbnailStrip();
    
    // 显示模态框
    if (imageViewerModal) imageViewerModal.style.display = 'flex';
    if (imageGalleryModal) imageGalleryModal.style.display = 'none';
}

// 获取随机特征
function getRandomFeature(type) {
    const features = {
        '形状': ['圆形', '椭圆形', '不规则形', '梭形', '多角形', '条状'],
        '颜色': ['褐色', '黄色', '黑色', '白色', '灰色', '紫红色'],
        '分布': ['散生', '聚生', '连片', '沿叶脉分布', '叶缘分布', '叶尖分布'],
        '边缘': ['清晰', '模糊', '波浪状', '黄晕', '水渍状', '干枯']
    };
    
    const options = features[type] || ['特征明显', '易于识别'];
    return options[Math.floor(Math.random() * options.length)];
}

// 更新图像计数器
function updateImageCounter() {
    const counterEl = document.getElementById('imageCounter');
    if (counterEl) {
        counterEl.textContent = `${currentImageIndex + 1} / ${filteredImages.length}`;
    }
}

// 渲染缩略图条
function renderThumbnailStrip() {
    const stripEl = document.getElementById('thumbnailStrip');
    if (!stripEl || !filteredImages.length) return;
    
    const startIndex = Math.max(0, currentImageIndex - 3);
    const endIndex = Math.min(filteredImages.length, startIndex + 7);
    const displayImages = filteredImages.slice(startIndex, endIndex);
    
    const html = displayImages.map((img, index) => {
        const isActive = (startIndex + index) === currentImageIndex;
        return `
            <div class="thumbnail-item ${isActive ? 'active' : ''}" 
                 onclick="openImage(${img.id})">
                <img src="${img.thumbnail}" 
                     alt="${img.crop} - ${img.disease}"
                     loading="lazy">
                <div class="thumbnail-overlay">${img.disease}</div>
            </div>
        `;
    }).join('');
    
    stripEl.innerHTML = html;
}

// 设置图像缩放
function setImageZoom(zoom) {
    currentZoom = zoom;
    const currentImageView = document.getElementById('currentImageView');
    if (currentImageView) {
        currentImageView.style.transform = `scale(${zoom})`;
    }
    
    // 更新按钮状态
    document.querySelectorAll('.zoom-level-btn').forEach(btn => {
        const level = parseFloat(btn.dataset.zoom);
        btn.classList.toggle('active', Math.abs(level - zoom) < 0.1);
    });
}

// 导航图像
function navigateImage(direction) {
    const newIndex = currentImageIndex + direction;
    
    if (newIndex >= 0 && newIndex < filteredImages.length) {
        currentImageIndex = newIndex;
        const image = filteredImages[currentImageIndex];
        openImage(image.id);
    }
}

// 切换幻灯片播放
function toggleSlideshow() {
    const slideshowBtn = document.getElementById('toggleSlideshow');
    
    if (slideshowInterval) {
        stopSlideshow();
        if (slideshowBtn) {
            slideshowBtn.innerHTML = '<i class="fas fa-play"></i> 开始播放';
        }
    } else {
        startSlideshow();
        if (slideshowBtn) {
            slideshowBtn.innerHTML = '<i class="fas fa-pause"></i> 停止播放';
        }
    }
}

// 开始幻灯片播放
function startSlideshow() {
    const speed = parseInt(document.getElementById('slideshowSpeed')?.value || 5) * 1000;
    
    slideshowInterval = setInterval(() => {
        if (currentImageIndex < filteredImages.length - 1) {
            navigateImage(1);
        } else {
            currentImageIndex = -1;
            navigateImage(1);
        }
    }, speed);
}

// 停止幻灯片播放
function stopSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
}

// 切换全屏
function toggleFullscreen() {
    const container = document.getElementById('imageDisplayArea');
    const fullscreenBtn = document.getElementById('toggleFullscreen');
    
    if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
        }
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }
}

// 下载当前图像
function downloadCurrentImage() {
    const image = filteredImages[currentImageIndex];
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image.preview || image.thumbnail;
    link.download = `${image.crop}_${image.disease}_${image.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 切换图像选择
function toggleImageSelect(imageId) {
    if (selectedImageIds.has(imageId)) {
        selectedImageIds.delete(imageId);
    } else {
        selectedImageIds.add(imageId);
    }
    updateImageStats();
    renderImageGallery();
}

// 清除选择的图像
function clearSelectedImages() {
    selectedImageIds.clear();
    updateImageStats();
    renderImageGallery();
}

// 查看选中的图像
function viewSelectedImages() {
    if (selectedImageIds.size === 0) {
        showShortcutHint('请先选择要查看的图像');
        return;
    }
    
    // 筛选出选中的图像
    const selectedImages = imagesData.images.filter(img => selectedImageIds.has(img.id));
    filteredImages = selectedImages;
    currentImagePage = 1;
    
    // 更新统计
    updateImageStats();
    
    // 重新渲染
    renderImageGallery();
}

// 应用图像筛选
function applyImageFilters() {
    const crop = document.getElementById('filterCrop')?.value || 'all';
    const disease = document.getElementById('filterDisease')?.value || 'all';
    const type = document.getElementById('filterType')?.value || 'all';
    const searchTerm = document.getElementById('imageSearch')?.value?.toLowerCase() || '';
    
    filteredImages = imagesData.images.filter(image => {
        // 作物筛选
        if (crop !== 'all' && image.crop !== crop) return false;
        
        // 病害筛选
        if (disease !== 'all' && image.disease !== disease) return false;
        
        // 类型筛选
        if (type !== 'all') {
            if (type === '健康' && !image.is_healthy) return false;
            if (type !== '健康' && image.type !== type) return false;
        }
        
        // 搜索筛选
        if (searchTerm) {
            const searchIn = `${image.crop} ${image.disease} ${image.type}`.toLowerCase();
            if (!searchIn.includes(searchTerm)) return false;
        }
        
        return true;
    });
    
    // 重置分页和选择
    currentImagePage = 1;
    selectedImageIds.clear();
    
    // 更新UI
    renderImageGallery();
    updateImageStats();
}

// 重置图像筛选
function resetImageFilters() {
    const cropSelect = document.getElementById('filterCrop');
    const diseaseSelect = document.getElementById('filterDisease');
    const typeSelect = document.getElementById('filterType');
    const searchInput = document.getElementById('imageSearch');
    
    if (cropSelect) cropSelect.value = 'all';
    if (diseaseSelect) diseaseSelect.value = 'all';
    if (typeSelect) typeSelect.value = 'all';
    if (searchInput) searchInput.value = '';
    
    selectedImageIds.clear();
    applyImageFilters();
}

// 清除搜索
function clearImageSearch() {
    const searchInput = document.getElementById('imageSearch');
    if (searchInput) {
        searchInput.value = '';
        applyImageFilters();
    }
}

// 更改图像页面
function changeImagePage(page) {
    const totalPages = Math.ceil(filteredImages.length / CONFIG.IMAGES_PER_PAGE);
    
    if (page >= 1 && page <= totalPages) {
        currentImagePage = page;
        renderImageGallery();
        
        // 滚动到顶部
        const galleryGrid = document.getElementById('galleryGrid');
        if (galleryGrid) {
            galleryGrid.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// 添加初始化筛选标签状态的函数
function initFilterTags() {
    // 危害程度标签初始化 - 单选，默认选择全部
    severityTags.forEach(tag => {
        const severity = tag.getAttribute('data-severity');
        tag.classList.toggle('active', severity === currentFilters.severity);
    });
    
    // 危害作物标签初始化 - 多选，默认选择全部
    cropTags.forEach(tag => {
        const crop = tag.getAttribute('data-crop');
        if (currentFilters.crop === 'all') {
            tag.classList.toggle('active', crop === 'all');
        } else {
            const selectedCrops = currentFilters.crop.split(',');
            tag.classList.toggle('active', crop === 'all' ? false : selectedCrops.includes(crop));
        }
    });
    
    // 病原类型标签初始化 - 多选，默认选择全部
    pathogenTags.forEach(tag => {
        const pathogen = tag.getAttribute('data-pathogen');
        if (currentFilters.pathogen === 'all') {
            tag.classList.toggle('active', pathogen === 'all');
        } else {
            const selectedPathogens = currentFilters.pathogen.split(',');
            tag.classList.toggle('active', pathogen === 'all' ? false : selectedPathogens.includes(pathogen));
        }
    });
    
    // 易发条件标签初始化 - 多选，默认选择全部
    conditionTags.forEach(tag => {
        const condition = tag.getAttribute('data-condition');
        if (currentFilters.condition === 'all') {
            tag.classList.toggle('active', condition === 'all');
        } else {
            const selectedConditions = currentFilters.condition.split(',');
            tag.classList.toggle('active', condition === 'all' ? false : selectedConditions.includes(condition));
        }
    });
}

// 更新筛选标签状态显示
function updateFilterTagsState() {
    console.log('更新筛选标签状态:', currentFilters);
    
    // 危害程度标签 - 单选
    severityTags.forEach(tag => {
        const severity = tag.getAttribute('data-severity');
        tag.classList.toggle('active', currentFilters.severity === severity);
    });
    
    // 危害作物标签 - 多选
    cropTags.forEach(tag => {
        const crop = tag.getAttribute('data-crop');
        if (currentFilters.crop === 'all') {
            tag.classList.toggle('active', crop === 'all');
        } else {
            const selectedCrops = currentFilters.crop.split(',');
            tag.classList.toggle('active', crop === 'all' ? false : selectedCrops.includes(crop));
        }
    });
    
    // 病原类型标签 - 多选
    pathogenTags.forEach(tag => {
        const pathogen = tag.getAttribute('data-pathogen');
        if (currentFilters.pathogen === 'all') {
            tag.classList.toggle('active', pathogen === 'all');
        } else {
            const selectedPathogens = currentFilters.pathogen.split(',');
            tag.classList.toggle('active', pathogen === 'all' ? false : selectedPathogens.includes(pathogen));
        }
    });
    
    // 易发条件标签 - 多选
    conditionTags.forEach(tag => {
        const condition = tag.getAttribute('data-condition');
        if (currentFilters.condition === 'all') {
            tag.classList.toggle('active', condition === 'all');
        } else {
            const selectedConditions = currentFilters.condition.split(',');
            tag.classList.toggle('active', condition === 'all' ? false : selectedConditions.includes(condition));
        }
    });
}

// 初始化图片懒加载观察器
function initLazyLoadObserver() {
    if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: `${CONFIG.LAZY_LOAD_OFFSET}px`
        });
    }
}

// 渲染病害卡片
function renderDiseases(diseases) {
    try {
        console.log('开始渲染病害，数量:', diseases.length);
        
        if (!diseases || !Array.isArray(diseases)) {
            console.error('病害数据格式错误:', diseases);
            throw new Error('病害数据格式错误');
        }

        // 如果没有病害数据，显示所有数据
        if (diseases.length === 0) {
            console.log('没有找到病害数据，显示所有病害');
            diseases = diseasesData;
        }

        // 如果还是没有数据，显示错误信息
        if (diseases.length === 0) {
            diseaseGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>未找到相关病害</h3>
                    <p>请尝试其他搜索关键词或选择其他作物类型</p>
                    <button onclick="resetFilters()" class="btn-primary" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> 重置所有筛选
                    </button>
                </div>
            `;
            return;
        }

        const cardsHTML = diseases.map(disease => {
            const isFavorite = favorites.includes(disease.id);
            const isInCompare = compareItems.includes(disease.id);
            
            // 获取图片URL
            const imageUrl = disease.images ? 
                (disease.images.main || `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(disease.name)}`) :
                (disease.image || `https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=${encodeURIComponent(disease.name)}`);
            
            // 获取病原菌简写
            const pathogenShort = disease.pathogen ? 
                disease.pathogen.split('(')[0].trim() : '未知病原';
            // 获取农药数量
            const pesticideCount = disease.pesticides ? disease.pesticides.length : 0;
            
            // 始终显示收藏和对比按钮
            const actionButtons = `
                <button class="card-action-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-id="${disease.id}" 
                        title="${isFavorite ? '取消收藏' : '收藏病害'}"
                        aria-label="${isFavorite ? '取消收藏' : '收藏病害'}">
                    <i class="fas fa-star"></i>
                </button>
                <button class="card-action-btn compare-btn ${isInCompare ? 'compare-active' : ''}" 
                        data-id="${disease.id}"
                        title="${isInCompare ? '从对比中移除' : '添加到对比'}"
                        aria-label="${isInCompare ? '从对比中移除' : '添加到对比'}">
                    <i class="fas fa-balance-scale"></i>
                </button>
            `;
            
return `
    <div class="disease-card" data-id="${disease.id}">
        <div class="card-actions">
            ${actionButtons}
        </div>
        <div class="disease-header">
            <span class="crop-badge">${disease.crop}</span>
            <h3>${disease.name}</h3>
            <p><i class="fas fa-virus"></i> ${pathogenShort}</p>
            ${disease.pathogen_type ? 
                `<span class="pathogen-type-tag ${disease.pathogen_type}">${disease.pathogen_type}病害</span>` : ''}
        </div>
        <div class="disease-body no-image">
            <div class="disease-content">
                <h4 class="disease-title">症状描述</h4>
                <p class="disease-symptoms">${disease.symptoms ? (disease.symptoms.substring(0, 150) + (disease.symptoms.length > 150 ? '...' : '')) : '暂无症状描述'}</p>
                <div class="disease-meta">
                    <div class="disease-meta-item">
                        <i class="fas fa-temperature-high"></i>
                        <span>危害程度：</span>
                        <span class="severity-badge ${disease.severity}">
                            ${disease.severity === 'high' ? '高危害' : 
                              disease.severity === 'medium' ? '中危害' : '低危害'}
                        </span>
                    </div>
                    <div class="disease-meta-item">
                        <i class="fas fa-syringe"></i>
                        <span>防治方案：${pesticideCount}种</span>
                    </div>
                    ${disease.recognition_accuracy ? `
                    <div class="disease-meta-item">
                        <i class="fas fa-bullseye"></i>
                        <span>识别率：${disease.recognition_accuracy}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="disease-tags">
                    <span class="tag"><i class="fas fa-seedling"></i> ${disease.crop}</span>
                    <span class="tag"><i class="fas fa-virus"></i> ${disease.pathogen_type || '未知'}病害</span>
                    ${disease.tags ? disease.tags.slice(0, 2).map(tag => 
                        `<span class="tag">${tag}</span>`).join('') : ''}
                </div>
            </div>
        </div>
        <div class="disease-footer">
            <a href="#" class="view-details" data-id="${disease.id}">
                <i class="fas fa-info-circle"></i> 查看详情
            </a>
            <span class="severity ${disease.severity}">
                ${disease.severity === 'high' ? '⚠️ 高危害' : 
                  disease.severity === 'medium' ? '⚠️ 中危害' : '⚠️ 低危害'}
            </span>
        </div>
    </div>
`;
        }).join('');

        console.log('生成的HTML长度:', cardsHTML.length);
        
        // 渲染到页面
        diseaseGrid.innerHTML = cardsHTML;

        // 初始化图片懒加载
        initImagesLazyLoad();
        
        // 添加事件监听器
        addCardEventListeners();

    } catch (error) {
        console.error('渲染病害列表失败:', error);
        diseaseGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>数据加载失败</h3>
                <p>请刷新页面或联系管理员</p>
                <button onclick="location.reload()" class="btn-primary">重新加载</button>
            </div>
        `;
    }
}

// 重置所有筛选
function resetFilters() {
    console.log('重置所有筛选');
    
    currentFilter = 'all';
    currentSearch = '';
    
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 重置筛选变量
    currentFilters = {
        severity: 'all',
        crop: 'all',
        pathogen: 'all',
        condition: 'all'
    };
    
    // 更新筛选标签状态
    updateFilterTagsState();
    
    filteredDiseases = [...diseasesData];
    
    // 只显示所有数据，不根据页面状态过滤
    renderDiseases(filteredDiseases);
    
    // 更新计数
    if (diseaseCount) {
        diseaseCount.textContent = filteredDiseases.length;
    }
    
    // 更新筛选状态显示
    updateFilterStatus();
    
    showShortcutHint('已重置所有筛选条件');
}

// 初始化图片懒加载
function initImagesLazyLoad() {
    const images = document.querySelectorAll('.disease-image.lazy');
    
    if (observer) {
        images.forEach(img => observer.observe(img));
    } else {
        // 备用方案：直接加载可见区域内的图片
        images.forEach(img => {
            if (isElementInViewport(img)) {
                img.src = img.dataset.src;
                img.classList.add('loaded');
            }
        });
    }
}

// 检查元素是否在视口内
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.bottom >= 0 &&
        rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
        rect.right >= 0
    );
}

// 添加卡片事件监听器
function addCardEventListeners() {
    console.log('添加卡片事件监听器');
    
    // 卡片点击事件
    document.querySelectorAll('.disease-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-actions') || 
                e.target.closest('.favorite-btn') || 
                e.target.closest('.compare-btn')) {
                return;
            }
            const id = parseInt(card.getAttribute('data-id'));
            showDiseaseDetails(id);
        });
    });

    // "查看详情"按钮
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            showDiseaseDetails(id);
        });
    });

    // 收藏按钮
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            toggleFavorite(id);
            
            // 添加视觉反馈
            btn.classList.toggle('active');
            const isFavorite = favorites.includes(id);
            btn.title = isFavorite ? '取消收藏' : '收藏病害';
            
            // 如果当前在收藏页面，更新显示
            if (favoritesLink && favoritesLink.classList.contains('active')) {
                showFavorites();
            }
        });
    });

    // 对比按钮
    document.querySelectorAll('.compare-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            toggleCompareItem(id);
        });
    });
}

function applyAdvancedFilter() {
    console.log('应用高级筛选:', currentFilters);
    
    let filtered = [...diseasesData];

    // 1. 危害程度筛选（单选）
    if (currentFilters.severity !== 'all') {
        filtered = filtered.filter(disease => disease.severity === currentFilters.severity);
    }

    // 2. 危害作物筛选（多选）
    if (currentFilters.crop !== 'all') {
        const selectedCrops = currentFilters.crop.split(',');
        filtered = filtered.filter(disease => 
            selectedCrops.includes(disease.crop)
        );
    }

    // 3. 病原类型筛选（多选）
    if (currentFilters.pathogen !== 'all') {
        const selectedPathogens = currentFilters.pathogen.split(',');
        filtered = filtered.filter(disease => 
            selectedPathogens.includes(disease.pathogen_type)
        );
    }

    // 4. 易发条件筛选（多选）
    if (currentFilters.condition !== 'all') {
        const selectedConditions = currentFilters.condition.split(',');
        filtered = filtered.filter(disease => 
            disease.conditions && disease.conditions.some(condition => 
                selectedConditions.includes(condition)
            )
        );
    }

    // 5. 应用搜索筛选（如果存在）
    if (currentSearch && currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase().trim();
        filtered = enhancedSearch(searchTerm);
        
        // 确保只保留经过其他筛选后的结果
        if (currentFilters.severity !== 'all') {
            filtered = filtered.filter(disease => disease.severity === currentFilters.severity);
        }
        if (currentFilters.crop !== 'all') {
            const selectedCrops = currentFilters.crop.split(',');
            filtered = filtered.filter(disease => 
                selectedCrops.includes(disease.crop)
            );
        }
        if (currentFilters.pathogen !== 'all') {
            const selectedPathogens = currentFilters.pathogen.split(',');
            filtered = filtered.filter(disease => 
                selectedPathogens.includes(disease.pathogen_type)
            );
        }
        if (currentFilters.condition !== 'all') {
            const selectedConditions = currentFilters.condition.split(',');
            filtered = filtered.filter(disease => 
                disease.conditions && disease.conditions.some(condition => 
                    selectedConditions.includes(condition)
                )
            );
        }
    }

    filteredDiseases = filtered;
    console.log('筛选后结果数量:', filteredDiseases.length);
    
    // 更新计数显示
    if (diseaseCount) {
        diseaseCount.textContent = filteredDiseases.length;
    }
    if (filteredCount) {
        filteredCount.textContent = filteredDiseases.length;
    }
    
    // 更新筛选状态显示
    updateFilterStatus();
    
    // 渲染结果
    renderDiseases(filteredDiseases);
    
    // 关闭筛选框
    closeFilter();
    
    // 更新筛选标签状态（确保关闭时状态正确）
    updateFilterTagsState();
}

function updateFilterStatus() {
    if (!currentFiltersEl) return;
    
    const activeFilters = [];
    
    // 危害程度筛选状态
    if (currentFilters.severity !== 'all') {
        let severityText = '';
        switch(currentFilters.severity) {
            case 'high': severityText = '高危害'; break;
            case 'medium': severityText = '中危害'; break;
            case 'low': severityText = '低危害'; break;
        }
        activeFilters.push(`<span class="status-tag"><i class="fas fa-exclamation-triangle"></i> 危害程度: ${severityText}</span>`);
    }
    
    // 危害作物筛选状态
    if (currentFilters.crop !== 'all') {
        const selectedCrops = currentFilters.crop.split(',');
        const cropText = selectedCrops.length > 1 ? 
            `${selectedCrops[0]}等${selectedCrops.length}种作物` : 
            selectedCrops[0];
        activeFilters.push(`<span class="status-tag"><i class="fas fa-seedling"></i> 作物: ${cropText}</span>`);
    }
    
    // 病原类型筛选状态
    if (currentFilters.pathogen !== 'all') {
        const selectedPathogens = currentFilters.pathogen.split(',');
        const pathogenText = selectedPathogens.length > 1 ? 
            `${selectedPathogens.length}种病原类型` : 
            `${selectedPathogens[0]}病害`;
        activeFilters.push(`<span class="status-tag"><i class="fas fa-virus"></i> 病原: ${pathogenText}</span>`);
    }
    
    // 易发条件筛选状态
    if (currentFilters.condition !== 'all') {
        const selectedConditions = currentFilters.condition.split(',');
        const conditionText = selectedConditions.length > 1 ? 
            `${selectedConditions[0]}等${selectedConditions.length}个条件` : 
            selectedConditions[0];
        activeFilters.push(`<span class="status-tag"><i class="fas fa-cloud-sun"></i> 条件: ${conditionText}</span>`);
    }
    
    if (currentSearch && currentSearch.trim() !== '') {
        activeFilters.push(`<span class="status-tag"><i class="fas fa-search"></i> 搜索: ${currentSearch}</span>`);
    }
    
    if (activeFilters.length === 0) {
        currentFiltersEl.innerHTML = '<span class="status-tag">全部病害</span>';
    } else {
        currentFiltersEl.innerHTML = activeFilters.join('');
    }
}

// 重置筛选
function resetAdvancedFilter() {
    console.log('重置所有筛选条件');
    
    // 重置筛选变量
    currentFilters = {
        severity: 'all',
        crop: 'all',
        pathogen: 'all',
        condition: 'all'
    };
    currentSearch = '';
    
    // 重置UI状态
    if (searchInput) {
        searchInput.value = '';
    }
    
    // 重置所有筛选标签状态
    updateFilterTagsState();
    
    // 应用重置后的筛选
    applyAdvancedFilter();
    
    // 显示提示
    showShortcutHint('已重置所有筛选条件');
}

// 打开筛选框
function openFilter() {
    if (filterOverlay) {
        filterOverlay.classList.add('show');
        if (filterTrigger) {
            filterTrigger.classList.add('active');
        }
        showShortcutHint('筛选框已打开，可选择多重筛选条件');
    }
}

// 设置筛选事件监听器
function setupFilterListeners() {
    // 筛选触发器
    if (filterTrigger) {
        filterTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openFilter();
        });
    }

    // 关闭筛选按钮
    if (filterClose) {
        filterClose.addEventListener('click', closeFilter);
    }

    // 点击筛选覆盖层外部关闭
    if (filterOverlay) {
        filterOverlay.addEventListener('click', (e) => {
            if (e.target === filterOverlay) {
                closeFilter();
            }
        });
    }

    // 危害程度筛选标签 - 修改为单选
    severityTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const severity = tag.getAttribute('data-severity');
            
            // 点击同一标签时切换选中状态
            if (currentFilters.severity === severity && severity !== 'all') {
                // 点击已选中的标签，取消选择
                tag.classList.remove('active');
                currentFilters.severity = 'all';
            } else {
                // 取消所有标签的选中状态
                severityTags.forEach(t => t.classList.remove('active'));
                // 选中当前标签
                tag.classList.add('active');
                currentFilters.severity = severity;
            }
            
            // 如果选择的是"全部"，高亮"全部"按钮
            if (severity === 'all') {
                tag.classList.add('active');
            }
            
            // 更新其他标签状态
            updateFilterTagsState();
        });
    });

    // 危害作物筛选标签 - 修改为多选
    cropTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const crop = tag.getAttribute('data-crop');
            
            // 如果是"全部"标签
            if (crop === 'all') {
                // 点击"全部"时，清除所有其他选择
                cropTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilters.crop = 'all';
            } else {
                // 先确保"全部"标签不被选中
                document.querySelector('.crop-tag[data-crop="all"]')?.classList.remove('active');
                
                // 切换当前标签的选中状态
                tag.classList.toggle('active');
                
                // 获取所有选中的作物标签
                const selectedCrops = [];
                document.querySelectorAll('.crop-tag.active').forEach(activeTag => {
                    const activeCrop = activeTag.getAttribute('data-crop');
                    if (activeCrop !== 'all') {
                        selectedCrops.push(activeCrop);
                    }
                });
                
                // 如果没有选中任何作物，则选择"全部"
                if (selectedCrops.length === 0) {
                    document.querySelector('.crop-tag[data-crop="all"]')?.classList.add('active');
                    currentFilters.crop = 'all';
                } else {
                    currentFilters.crop = selectedCrops.join(',');
                }
            }
            
            console.log('当前选中的作物:', currentFilters.crop);
            updateFilterTagsState();
        });
    });

    // 病原类型筛选标签 - 修改为多选
    pathogenTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const pathogen = tag.getAttribute('data-pathogen');
            
            // 如果是"全部"标签
            if (pathogen === 'all') {
                // 点击"全部"时，清除所有其他选择
                pathogenTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilters.pathogen = 'all';
            } else {
                // 先确保"全部"标签不被选中
                document.querySelector('.pathogen-tag[data-pathogen="all"]')?.classList.remove('active');
                
                // 切换当前标签的选中状态
                tag.classList.toggle('active');
                
                // 获取所有选中的病原类型标签
                const selectedPathogens = [];
                document.querySelectorAll('.pathogen-tag.active').forEach(activeTag => {
                    const activePathogen = activeTag.getAttribute('data-pathogen');
                    if (activePathogen !== 'all') {
                        selectedPathogens.push(activePathogen);
                    }
                });
                
                // 如果没有选中任何病原类型，则选择"全部"
                if (selectedPathogens.length === 0) {
                    document.querySelector('.pathogen-tag[data-pathogen="all"]')?.classList.add('active');
                    currentFilters.pathogen = 'all';
                } else {
                    currentFilters.pathogen = selectedPathogens.join(',');
                }
            }
            
            console.log('当前选中的病原类型:', currentFilters.pathogen);
            updateFilterTagsState();
        });
    });

    // 易发条件筛选标签 - 修改为多选
    conditionTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const condition = tag.getAttribute('data-condition');
            
            // 如果是"全部"标签
            if (condition === 'all') {
                // 点击"全部"时，清除所有其他选择
                conditionTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilters.condition = 'all';
            } else {
                // 先确保"全部"标签不被选中
                document.querySelector('.condition-tag[data-condition="all"]')?.classList.remove('active');
                
                // 切换当前标签的选中状态
                tag.classList.toggle('active');
                
                // 获取所有选中的条件标签
                const selectedConditions = [];
                document.querySelectorAll('.condition-tag.active').forEach(activeTag => {
                    const activeCondition = activeTag.getAttribute('data-condition');
                    if (activeCondition !== 'all') {
                        selectedConditions.push(activeCondition);
                    }
                });
                
                // 如果没有选中任何条件，则选择"全部"
                if (selectedConditions.length === 0) {
                    document.querySelector('.condition-tag[data-condition="all"]')?.classList.add('active');
                    currentFilters.condition = 'all';
                } else {
                    currentFilters.condition = selectedConditions.join(',');
                }
            }
            
            console.log('当前选中的条件:', currentFilters.condition);
            updateFilterTagsState();
        });
    });

    // 应用筛选按钮
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            applyAdvancedFilter();
            showShortcutHint('筛选条件已应用');
        });
    }

    // 重置筛选按钮
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetAdvancedFilter);
    }
}

function closeFilter() {
    if (filterOverlay) {
        filterOverlay.classList.remove('show');
        if (filterTrigger) {
            filterTrigger.classList.remove('active');
        }
    }
    // 确保标签状态正确
    updateFilterTagsState();
}

// 显示病害详情模态框
function showDiseaseDetails(id) {
    const disease = diseasesData.find(d => d.id === id);
    if (!disease) {
        showShortcutHint('未找到病害信息');
        return;
    }

    // 更新模态框标题
    document.getElementById('modalTitle').innerHTML = `
        <span class="crop-badge">${disease.crop}</span>
        ${disease.name}
        ${disease.pathogen_type ? `<span class="pathogen-type-tag ${disease.pathogen_type}">${disease.pathogen_type}病害</span>` : ''}
    `;

    // 构建详情内容
    const modalBody = document.querySelector('#diseaseModal .modal-body');
    
    // 结构化症状描述
    let symptomsHtml = '';
    if (disease.symptoms_detail) {
        symptomsHtml = `
            <div class="structured-symptoms">
                <h4><i class="fas fa-list"></i> 结构化症状分析</h4>
                <div class="symptoms-grid">
                    ${Object.entries(disease.symptoms_detail).map(([key, value]) => {
                        if (Array.isArray(value) && value.length > 0) {
                            return `
                                <div class="symptom-category">
                                    <strong>${key}：</strong>
                                    <span>${value.join('、')}</span>
                                </div>
                            `;
                        }
                        return '';
                    }).join('')}
                </div>
            </div>
        `;
    }
    let conditionsHtml = '';
if (disease.conditions && disease.conditions.length > 0) {
    conditionsHtml = `
        <div class="disease-detail-section">
            <h3><i class="fas fa-cloud-sun"></i> 易发条件</h3>
            <div class="detail-item">
                <strong>易发环境与条件</strong>
                <div class="conditions-grid">
                    ${disease.conditions.map(condition => 
                        `<span class="condition-tag">${condition}</span>`
                    ).join('')}
                </div>
            </div>
        </div>
    `;
}

    // 农药信息表格
    let pesticidesHtml = '';
    if (disease.pesticides && disease.pesticides.length > 0) {
        pesticidesHtml = `
            <div class="pesticides-table">
                <h4><i class="fas fa-table"></i> 推荐防治药剂</h4>
                <table>
                    <thead>
                        <tr>
                            <th>药剂名称</th>
                            <th>使用浓度</th>
                            <th>安全间隔期</th>
                            <th>适用时期</th>
                            <th>注意事项</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${disease.pesticides.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.concentration}</td>
                                <td>${p.safety}</td>
                                <td>${Array.isArray(p.stage) ? p.stage.join('、') : (p.stage || '发病初期')}</td>
                                <td>${p.precautions ? p.precautions.join('；') : '无'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (disease.pesticides) {
        pesticidesHtml = `
            <div class="pesticides-list">
                <h4><i class="fas fa-prescription-bottle-alt"></i> 推荐防治药剂</h4>
                ${disease.pesticides.map(p => `
                    <div class="detail-item">
                        <strong>${p.name}</strong>
                        <p><strong>使用浓度：</strong>${p.concentration}</p>
                        <p><strong>安全间隔期：</strong>${p.safety}</p>
                        <p><strong>适用时期：</strong>${p.stage || '发病初期'}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 农业防治措施
    let agriculturalControlHtml = '';
    if (disease.agricultural_control && disease.agricultural_control.length > 0) {
        agriculturalControlHtml = `
            <div class="agricultural-control">
                <h4><i class="fas fa-tractor"></i> 农业防治措施</h4>
                <ul>
                    ${disease.agricultural_control.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // 发生规律
    let epidemiologyHtml = '';
    if (disease.growth_stages || disease.weather_conditions || disease.optimal_temperature) {
        epidemiologyHtml = `
            <div class="epidemiology">
                <h4><i class="fas fa-chart-line"></i> 发生规律</h4>
                <div class="epidemiology-grid">
                    ${disease.growth_stages ? `
                        <div class="epidemiology-item">
                            <strong>易发时期：</strong>
                            <span>${Array.isArray(disease.growth_stages) ? disease.growth_stages.join('、') : disease.growth_stages}</span>
                        </div>
                    ` : ''}
                    ${disease.weather_conditions ? `
                        <div class="epidemiology-item">
                            <strong>适宜条件：</strong>
                            <span>${Array.isArray(disease.weather_conditions) ? disease.weather_conditions.join('、') : disease.weather_conditions}</span>
                        </div>
                    ` : ''}
                    ${disease.optimal_temperature ? `
                        <div class="epidemiology-item">
                            <strong>适宜温度：</strong>
                            <span>${disease.optimal_temperature}</span>
                        </div>
                    ` : ''}
                    ${disease.optimal_humidity ? `
                        <div class="epidemiology-item">
                            <strong>适宜湿度：</strong>
                            <span>${disease.optimal_humidity}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // 图像预览部分
    let imageGalleryHtml = '';
if (imagesData) {
    // 改进的图像匹配逻辑
    const relatedImages = imagesData.images.filter(img => {
        // 精确匹配：病害名称完全匹配（去除可能的后缀）
        const diseaseNameMatch = disease.name.includes(img.disease) || 
                                 img.disease.includes(disease.name) ||
                                 // 处理常见的病害名称变体
                                 disease.name.replace(/病$/, '') === img.disease.replace(/病$/, '');
        
        // 作物匹配
        const cropMatch = img.crop === disease.crop;
        
        // 症状关键词匹配（可选）
        const symptomKeywords = extractKeywordsFromSymptoms(disease.symptoms);
        const imageKeywords = extractKeywordsFromImage(img);
        
        // 返回匹配结果：优先名称+作物，然后是作物匹配
        return diseaseNameMatch && cropMatch;
    }).slice(0, 6);
    
    // 如果精确匹配没有结果，则放宽条件
    if (relatedImages.length === 0) {
        // 仅按作物匹配
        relatedImages = imagesData.images.filter(img => img.crop === disease.crop)
            .slice(0, 4);
    }
    
    if (relatedImages.length > 0) {
        // 检查是否有完全匹配的病害图像
        const exactMatches = relatedImages.filter(img => 
            disease.name.includes(img.disease) || img.disease.includes(disease.name)
        );
        
        // 显示匹配信息
        const matchInfo = exactMatches.length > 0 ? 
            ` (已匹配${exactMatches.length}张)` : 
            ` (相关作物图像)`;
            
        imageGalleryHtml = `
            <div class="disease-image-gallery">
                <h3><i class="fas fa-images"></i> 病害图像预览${matchInfo}</h3>
                <div class="image-gallery-controls">
                    <button class="btn-small" onclick="openImageGallery(); filterImagesByDisease('${disease.name}')">
                        <i class="fas fa-external-link-alt"></i> 查看完整图像库
                    </button>
                    ${exactMatches.length === 0 ? `
                    <button class="btn-small" onclick="openImageGallery(); filterImagesByCrop('${disease.crop}')" style="margin-left: 10px;">
                        <i class="fas fa-search"></i> 搜索更多${disease.crop}病害
                    </button>
                    ` : ''}
                </div>
                <div class="preview-images-grid" id="previewImages${id}">
                    ${relatedImages.map(img => {
                        const isExactMatch = disease.name.includes(img.disease) || img.disease.includes(disease.name);
                        return `
                        <div class="preview-image-item ${isExactMatch ? 'exact-match' : 'related-match'}" 
                             onclick="openImage(${img.id})"
                             title="${isExactMatch ? '该病害图像' : '相关作物图像'}">
                            <img src="${img.thumbnail}" 
                                 alt="${img.crop} - ${img.disease}"
                                 loading="lazy"
                                 onerror="this.src='https://via.placeholder.com/150/4CAF50/FFFFFF?text=${encodeURIComponent(img.crop)}'">
                            <div class="preview-image-info">
                                <span class="preview-crop">${img.crop}</span>
                                <span class="preview-disease">${img.disease}</span>
                                ${isExactMatch ? 
                                  '<span class="match-badge">匹配</span>' : 
                                  '<span class="related-badge">相关</span>'}
                            </div>
                        </div>
                    `}).join('')}
                </div>
                ${exactMatches.length === 0 ? `
                <div class="image-preview-note">
                    <i class="fas fa-info-circle"></i>
                    <span>未找到精确的${disease.name}图像，显示的是${disease.crop}的其他病害图像作为参考</span>
                </div>
                ` : ''}
            </div>
        `;
    }
}

    // 知识图谱部分
    const knowledgeGraphHtml = `
        <div class="knowledge-graph-section">
            <h3><i class="fas fa-project-diagram"></i> 知识图谱关联分析</h3>
            <div class="graph-controls">
                <button id="graphResetView" class="btn-small">
                    <i class="fas fa-redo"></i> 重置视图
                </button>
                <button id="graphZoomIn" class="btn-small">
                    <i class="fas fa-search-plus"></i> 放大
                </button>
                <button id="graphZoomOut" class="btn-small">
                    <i class="fas fa-search-minus"></i> 缩小
                </button>
                <div class="graph-legend">
                    <span class="legend-item"><div class="legend-color disease"></div>病害</span>
                    <span class="legend-item"><div class="legend-color pathogen"></div>病原菌</span>
                    <span class="legend-item"><div class="legend-color crop"></div>作物</span>
                    <span class="legend-item"><div class="legend-color pesticide"></div>药剂</span>
                    <span class="legend-item"><div class="legend-color related"></div>相关病害</span>
                </div>
            </div>
            <div id="knowledgeGraph" class="knowledge-graph-container"></div>
            <div class="graph-tooltip" id="graphTooltip"></div>
            
            <!-- 知识图谱节点详情弹窗 -->
            <div id="graphNodeDetailOverlay" class="graph-node-detail-overlay"></div>
            <div id="graphNodeDetail" class="graph-node-detail">
                <div class="graph-node-detail-header">
                    <h3 class="graph-node-detail-title"><i class="fas fa-info-circle"></i> 节点详情</h3>
                    <button class="graph-node-detail-close" onclick="closeGraphNodeDetail()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="graph-node-detail-content" id="graphNodeDetailContent">
                    <!-- 内容动态加载 -->
                </div>
                <div class="graph-node-detail-actions">
                    <button onclick="closeGraphNodeDetail()" class="btn-secondary">关闭</button>
                </div>
            </div>
        </div>
    `;

    modalBody.innerHTML = `
        <div class="disease-detail-section">
            <h3><i class="fas fa-virus"></i> 病害基本信息</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>病害名称</strong>
                    <p>${disease.name}</p>
                </div>
                <div class="detail-item">
                    <strong>危害作物</strong>
                    <p>${disease.crop}</p>
                </div>
                <div class="detail-item">
                    <strong>病原菌</strong>
                    <p>${disease.pathogen}</p>
                </div>
                ${disease.pathogen_type ? `
                <div class="detail-item">
                    <strong>病原类型</strong>
                    <p><span class="pathogen-type-tag ${disease.pathogen_type}">${disease.pathogen_type}病害</span></p>
                </div>
                ` : ''}
                <div class="detail-item">
                    <strong>危害程度</strong>
                    <p>
                        <span class="severity ${disease.severity}">
                            ${disease.severity === 'high' ? '⚠️ 高危害 - 需立即防治' : 
                              disease.severity === 'medium' ? '⚠️ 中危害 - 及时防治' : '⚠️ 低危害 - 注意观察'}
                        </span>
                    </p>
                </div>
                ${disease.recognition_accuracy ? `
                <div class="detail-item">
                    <strong>识别准确率</strong>
                    <p><span class="accuracy-badge">${disease.recognition_accuracy}</span></p>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="disease-detail-section">
            <h3><i class="fas fa-stethoscope"></i> 症状识别</h3>
            <div class="detail-item">
                <strong>典型症状</strong>
                <p>${disease.symptoms}</p>
            </div>
            ${symptomsHtml}
        </div>
         ${conditionsHtml} 

        ${epidemiologyHtml}

        ${agriculturalControlHtml}

        ${imageGalleryHtml}

        <div class="disease-detail-section">
            <h3><i class="fas fa-shield-alt"></i> 预防措施</h3>
            <div class="detail-item">
                <strong>综合预防</strong>
                <p>${disease.prevention}</p>
            </div>
        </div>

        ${pesticidesHtml}

        ${knowledgeGraphHtml}

        ${disease.references ? `
        <div class="disease-detail-section">
            <h3><i class="fas fa-book"></i> 参考文献</h3>
            <div class="detail-item">
                <p>${disease.references}</p>
            </div>
        </div>
        ` : ''}

        <div class="project-connection">
            <div class="detail-item highlight">
                <strong><i class="fas fa-robot"></i> 本项目智能识别能力</strong>
                <p>本项目基于机器视觉的病虫害识别系统可准确识别${disease.name}，识别准确率达${disease.recognition_accuracy || '90%'}以上。系统结合知识图谱，可为您提供个性化防治建议。</p>
                ${disease.project_features ? `
                <p><strong>识别特征：</strong> ${Array.isArray(disease.project_features) ? disease.project_features.join('、') : disease.project_features}</p>
                ` : ''}
                <button class="btn-primary" style="margin-top: 10px;">
                    <i class="fas fa-mobile-alt"></i> 使用手机APP识别
                </button>
            </div>
        </div>

        <div class="related-diseases" style="margin-top: 20px;">
            <h4><i class="fas fa-link"></i> 相关病害</h4>
            <div class="related-tags">
                ${disease.related_diseases && disease.related_diseases.length > 0 ? 
                    disease.related_diseases.map(relId => {
                        const relDisease = diseasesData.find(d => d.id === relId);
                        return relDisease ? 
                            `<span class="related-tag" onclick="showDiseaseDetails(${relId}); closeGraphNodeDetail()">${relDisease.name}</span>` : '';
                    }).join('') : 
                    '<p>暂无相关病害数据</p>'
                }
            </div>
        </div>
    `;

    // 显示模态框
    diseaseModal.style.display = 'flex';
    
    // 初始化知识图谱
    setTimeout(() => {
        initKnowledgeGraph(id);
        
        // 如果 ECharts 未加载，显示提示
        if (!window.echarts) {
            const graphContainer = document.getElementById('knowledgeGraph');
            if (graphContainer) {
                graphContainer.innerHTML = `
                    <div class="graph-loading">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>图表库加载失败，请刷新页面重试</p>
                    </div>
                `;
            }
        }
    }, 100);
}

function extractKeywordsFromSymptoms(symptoms) {
    if (!symptoms) return [];
    
    // 常见的病害症状关键词
    const symptomKeywords = [
        '斑点', '病斑', '霉层', '腐烂', '枯萎', '黄化', '坏死', 
        '水渍', '畸形', '卷曲', '干枯', '褪绿', '穿孔', '溃疡'
    ];
    
    return symptomKeywords.filter(keyword => 
        symptoms.includes(keyword)
    );
}

// 图像关键词提取
function extractKeywordsFromImage(image) {
    const keywords = [];
    
    if (image.disease) {
        keywords.push(image.disease);
    }
    if (image.crop) {
        keywords.push(image.crop);
    }
    if (image.type) {
        keywords.push(image.type);
    }
    
    return keywords;
}
// 知识图谱相关函数

// 初始化知识图谱
function initKnowledgeGraph(diseaseId) {
    const disease = diseasesData.find(d => d.id === diseaseId);
    if (!disease) return;
    
    const graphContainer = document.getElementById('knowledgeGraph');
    if (!graphContainer) return;
    
    // 清除之前的图表
    if (knowledgeGraphChart) {
        knowledgeGraphChart.dispose();
    }
    
    // 构建图谱数据
    const graphData = buildKnowledgeGraphData(disease);
    
    // 初始化图表
    knowledgeGraphChart = echarts.init(graphContainer);
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                if (params.dataType === 'node') {
                    return `${params.data.name}<br/><small>${params.data.type || '未知类型'}</small>`;
                }
                return `${params.data.source} → ${params.data.target}`;
            }
        },
        legend: {
            show: false
        },
        series: [
            {
                type: 'graph',
                layout: 'force',
                symbolSize: 50,
                roam: true,
                draggable: true,
                edgeSymbol: ['circle', 'arrow'],
                edgeSymbolSize: [4, 10],
                edgeLabel: {
                    show: true,
                    formatter: '{c}'
                },
                force: {
                    repulsion: 200,
                    gravity: 0.1,
                    edgeLength: 100,
                    layoutAnimation: true
                },
                data: graphData.nodes,
                links: graphData.links,
                categories: [
                    { name: '病害', itemStyle: { color: '#ff4757' } },
                    { name: '病原菌', itemStyle: { color: '#2ed573' } },
                    { name: '作物', itemStyle: { color: '#3742fa' } },
                    { name: '药剂', itemStyle: { color: '#ffa502' } },
                    { name: '相关病害', itemStyle: { color: '#6a11cb' } }
                ],
                lineStyle: {
                    color: 'source',
                    curveness: 0.2
                },
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: {
                        width: 3
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{b}'
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2
                }
            }
        ]
    };
    
    knowledgeGraphChart.setOption(option);
    
    // 添加点击事件
    knowledgeGraphChart.on('click', function(params) {
        if (params.dataType === 'node') {
            showGraphNodeDetail(params.data);
        }
    });
    
    // 添加图表控制功能
    setupGraphControls();
    
    // 窗口大小改变时重新调整图表大小
    window.addEventListener('resize', function() {
        if (knowledgeGraphChart) {
            knowledgeGraphChart.resize();
        }
    });
}

// 构建知识图谱数据
function buildKnowledgeGraphData(disease) {
    const nodes = [];
    const links = [];
    
    // 中心节点：当前病害
    const centerNode = {
        id: `disease_${disease.id}`,
        name: disease.name,
        value: 100,
        symbolSize: 60,
        category: 0,
        type: '病害',
        diseaseId: disease.id
    };
    nodes.push(centerNode);
    
    // 病原菌节点
    if (disease.pathogen) {
        const pathogenNode = {
            id: `pathogen_${disease.id}`,
            name: disease.pathogen.split('(')[0].trim(),
            value: 80,
            symbolSize: 45,
            category: 1,
            type: '病原菌',
            description: disease.pathogen
        };
        nodes.push(pathogenNode);
        links.push({
            source: centerNode.id,
            target: pathogenNode.id,
            value: '病原',
            label: {
                show: true,
                formatter: '病原'
            }
        });
    }
    
    // 作物节点
    const cropNode = {
        id: `crop_${disease.crop}`,
        name: disease.crop,
        value: 70,
        symbolSize: 40,
        category: 2,
        type: '作物'
    };
    nodes.push(cropNode);
    links.push({
        source: centerNode.id,
        target: cropNode.id,
        value: '危害作物',
        label: {
            show: true,
            formatter: '危害作物'
        }
    });
    
    // 农药节点
    if (disease.pesticides && disease.pesticides.length > 0) {
        disease.pesticides.slice(0, 3).forEach((pesticide, index) => {
            const pesticideNode = {
                id: `pesticide_${disease.id}_${index}`,
                name: pesticide.name,
                value: 60,
                symbolSize: 35,
                category: 3,
                type: '药剂',
                pesticide: pesticide
            };
            nodes.push(pesticideNode);
            links.push({
                source: centerNode.id,
                target: pesticideNode.id,
                value: '防治药剂',
                label: {
                    show: true,
                    formatter: '防治药剂'
                }
            });
        });
    }
    
    // 相关病害节点
    if (disease.related_diseases && disease.related_diseases.length > 0) {
        disease.related_diseases.slice(0, 3).forEach(relatedId => {
            const relatedDisease = diseasesData.find(d => d.id === relatedId);
            if (relatedDisease) {
                const relatedNode = {
                    id: `disease_${relatedId}`,
                    name: relatedDisease.name,
                    value: 50,
                    symbolSize: 40,
                    category: 4,
                    type: '相关病害',
                    diseaseId: relatedId
                };
                nodes.push(relatedNode);
                links.push({
                    source: centerNode.id,
                    target: relatedNode.id,
                    value: '相似病害',
                    label: {
                        show: true,
                        formatter: '相似病害'
                    }
                });
            }
        });
    } else {
        // 如果没有相关病害数据，添加相似病害（基于相同作物）
        const similarDiseases = diseasesData.filter(d => 
            d.id !== disease.id && 
            d.crop === disease.crop
        ).slice(0, 2);
        
        similarDiseases.forEach(similarDisease => {
            const relatedNode = {
                id: `disease_${similarDisease.id}`,
                name: similarDisease.name,
                value: 50,
                symbolSize: 40,
                category: 4,
                type: '相关病害',
                diseaseId: similarDisease.id
            };
            nodes.push(relatedNode);
            links.push({
                source: centerNode.id,
                target: relatedNode.id,
                value: '相似病害',
                label: {
                    show: true,
                    formatter: '相似病害'
                }
            });
        });
    }
    
    // 病原类型节点（如果有）
    if (disease.pathogen_type) {
        const typeNode = {
            id: `type_${disease.pathogen_type}`,
            name: `${disease.pathogen_type}病害`,
            value: 40,
            symbolSize: 30,
            category: 1,
            type: '病原类型'
        };
        nodes.push(typeNode);
        links.push({
            source: centerNode.id,
            target: typeNode.id,
            value: '病原类型',
            label: {
                show: true,
                formatter: '病原类型'
            }
        });
    }
    
    return { nodes, links };
}

// 显示知识图谱节点详情
function showGraphNodeDetail(nodeData) {
    const detailOverlay = document.getElementById('graphNodeDetailOverlay');
    const detailModal = document.getElementById('graphNodeDetail');
    const detailContent = document.getElementById('graphNodeDetailContent');
    
    if (!detailOverlay || !detailModal || !detailContent) return;
    
    let contentHTML = '';
    
    switch(nodeData.type) {
        case '病害':
            const disease = diseasesData.find(d => d.id === nodeData.diseaseId);
            if (disease) {
                contentHTML = `
                    <div class="disease-detail">
                        <h4>${disease.name}</h4>
                        <p><strong>作物:</strong> ${disease.crop}</p>
                        <p><strong>病原菌:</strong> ${disease.pathogen || '未知'}</p>
                        <p><strong>危害程度:</strong> 
                            <span class="severity ${disease.severity}">
                                ${disease.severity === 'high' ? '高危害' : 
                                  disease.severity === 'medium' ? '中危害' : '低危害'}
                            </span>
                        </p>
                        <p><strong>典型症状:</strong> ${disease.symptoms.substring(0, 100)}...</p>
                        <div class="graph-node-detail-actions">
                            <button onclick="showDiseaseDetails(${disease.id}); closeGraphNodeDetail()" class="btn-primary">
                                <i class="fas fa-external-link-alt"></i> 查看完整详情
                            </button>
                        </div>
                    </div>
                `;
            }
            break;
            
        case '病原菌':
            contentHTML = `
                <div class="pathogen-detail">
                    <h4>${nodeData.name}</h4>
                    <p><strong>病原菌描述:</strong> ${nodeData.description || '暂无详细描述'}</p>
                    <p><strong>病原类型:</strong> ${nodeData.category === 1 ? '真菌' : 
                                                 nodeData.category === 2 ? '细菌' : 
                                                 nodeData.category === 3 ? '病毒' : '未知'}</p>
                </div>
            `;
            break;
            
        case '作物':
            const cropDiseases = diseasesData.filter(d => d.crop === nodeData.name);
            contentHTML = `
                <div class="crop-detail">
                    <h4>${nodeData.name}</h4>
                    <p><strong>相关病害数量:</strong> ${cropDiseases.length}种</p>
                    <p><strong>主要病害:</strong></p>
                    <div class="related-diseases-list">
                        ${cropDiseases.slice(0, 5).map(d => 
                            `<span class="related-disease-tag" onclick="showDiseaseDetails(${d.id}); closeGraphNodeDetail()">${d.name}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
            break;
            
        case '药剂':
            if (nodeData.pesticide) {
                contentHTML = `
                    <div class="pesticide-detail">
                        <h4>${nodeData.pesticide.name}</h4>
                        <p><strong>使用浓度:</strong> ${nodeData.pesticide.concentration}</p>
                        <p><strong>安全间隔期:</strong> ${nodeData.pesticide.safety}</p>
                        <p><strong>适用时期:</strong> ${nodeData.pesticide.stage || '发病初期'}</p>
                        ${nodeData.pesticide.precautions ? 
                            `<p><strong>注意事项:</strong> ${nodeData.pesticide.precautions.join('；')}</p>` : ''}
                    </div>
                `;
            }
            break;
            
        case '相关病害':
            const relatedDisease = diseasesData.find(d => d.id === nodeData.diseaseId);
            if (relatedDisease) {
                contentHTML = `
                    <div class="related-disease-detail">
                        <h4>${relatedDisease.name}</h4>
                        <p><strong>作物:</strong> ${relatedDisease.crop}</p>
                        <p><strong>病原菌:</strong> ${relatedDisease.pathogen?.split('(')[0] || '未知'}</p>
                        <p><strong>相似度:</strong> 基于相同作物和相似症状</p>
                        <div class="graph-node-detail-actions">
                            <button onclick="showDiseaseDetails(${relatedDisease.id}); closeGraphNodeDetail()" class="btn-primary">
                                <i class="fas fa-external-link-alt"></i> 查看病害详情
                            </button>
                        </div>
                    </div>
                `;
            }
            break;
            
        default:
            contentHTML = `<p>暂无详细信息</p>`;
    }
    
    detailContent.innerHTML = contentHTML;
    detailOverlay.classList.add('active');
    detailModal.classList.add('active');
}

// 关闭知识图谱节点详情
function closeGraphNodeDetail() {
    const detailOverlay = document.getElementById('graphNodeDetailOverlay');
    const detailModal = document.getElementById('graphNodeDetail');
    
    if (detailOverlay) detailOverlay.classList.remove('active');
    if (detailModal) detailModal.classList.remove('active');
}

// 设置图谱控制功能
function setupGraphControls() {
    const resetBtn = document.getElementById('graphResetView');
    const zoomInBtn = document.getElementById('graphZoomIn');
    const zoomOutBtn = document.getElementById('graphZoomOut');
    
    if (resetBtn && knowledgeGraphChart) {
        resetBtn.addEventListener('click', function() {
            knowledgeGraphChart.dispatchAction({
                type: 'restore'
            });
        });
    }
    
    if (zoomInBtn && knowledgeGraphChart) {
        zoomInBtn.addEventListener('click', function() {
            const option = knowledgeGraphChart.getOption();
            const currentZoom = option.series[0].zoom || 1;
            knowledgeGraphChart.setOption({
                series: [{
                    zoom: currentZoom * 1.2
                }]
            });
        });
    }
    
    if (zoomOutBtn && knowledgeGraphChart) {
        zoomOutBtn.addEventListener('click', function() {
            const option = knowledgeGraphChart.getOption();
            const currentZoom = option.series[0].zoom || 1;
            knowledgeGraphChart.setOption({
                series: [{
                    zoom: currentZoom * 0.8
                }]
            });
        });
    }
}

// 切换收藏状态
function toggleFavorite(id) {
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
        showShortcutHint('已取消收藏');
    } else {
        favorites.push(id);
        showShortcutHint('已添加到收藏');
    }
    
    // 保存到本地存储
    localStorage.setItem('disease_favorites', JSON.stringify(favorites));
    
    // 更新UI
    updateFavoritesCount();
    updateFavoriteButton(id);
}

// 更新收藏按钮状态
function updateFavoriteButton(id) {
    const btn = document.querySelector(`.favorite-btn[data-id="${id}"]`);
    if (btn) {
        const isFavorite = favorites.includes(id);
        btn.classList.toggle('active', isFavorite);
        btn.title = isFavorite ? '取消收藏' : '收藏病害';
        btn.innerHTML = `<i class="fas fa-star"></i>`;
        
        // 添加动画效果
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 200);
    }
}

// 更新收藏计数
function updateFavoritesCount() {
    const count = favorites.length;
    if (favoritesCount) favoritesCount.textContent = count;
    
    const favoritesCountEl = document.querySelector('.favorites-count');
    if (favoritesCountEl) favoritesCountEl.textContent = count;
}

// 切换对比项
function toggleCompareItem(id) {
    const index = compareItems.indexOf(id);
    
    if (index > -1) {
        compareItems.splice(index, 1);
        showShortcutHint('已从对比中移除');
    } else {
        if (compareItems.length >= CONFIG.MAX_COMPARE_ITEMS) {
            showShortcutHint('最多只能对比' + CONFIG.MAX_COMPARE_ITEMS + '个病害');
            return;
        }
        compareItems.push(id);
        showShortcutHint('已添加到对比');
    }
    
    localStorage.setItem('disease_compare', JSON.stringify(compareItems));
    
    // 更新UI
    updateCompareCount();
    updateCompareButton(id);
    updateCompareToolbar();
}

// 更新对比按钮状态
function updateCompareButton(id) {
    const btn = document.querySelector(`.compare-btn[data-id="${id}"]`);
    if (btn) {
        const isInCompare = compareItems.includes(id);
        btn.classList.toggle('compare-active', isInCompare);
        btn.title = isInCompare ? '从对比中移除' : '添加到对比';
        btn.innerHTML = `<i class="fas fa-balance-scale"></i>`;
    }
}

// 更新对比计数
function updateCompareCount() {
    const count = compareItems.length;
    if (compareCount) compareCount.textContent = count;
    
    const compareBadge = document.getElementById('compareBadge');
    if (compareBadge) {
        if (count > 0) {
            compareBadge.textContent = count;
            compareBadge.style.display = 'flex';
        } else {
            compareBadge.style.display = 'none';
        }
    }
}

// 更新对比工具栏
function updateCompareToolbar() {
    if (!compareToolbar) return;
    
    if (compareItems.length > 0) {
        compareToolbar.style.display = 'block';
        compareList.innerHTML = compareItems.map(id => {
            const disease = diseasesData.find(d => d.id === id);
            return disease ? `
                <div class="compare-item">
                    <span>${disease.name} (${disease.crop})</span>
                    <button class="remove-compare" data-id="${id}" title="移除">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            ` : '';
        }).join('');
        
        // 添加移除按钮的事件监听器
        document.querySelectorAll('.remove-compare').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                toggleCompareItem(id);
            });
        });
    } else {
        compareToolbar.style.display = 'none';
        compareList.innerHTML = '';
    }
}

// 清空对比
function clearCompare() {
    compareItems = [];
    localStorage.setItem('disease_compare', JSON.stringify(compareItems));
    updateCompareCount();
    updateCompareToolbar();
    
    document.querySelectorAll('.compare-btn').forEach(btn => {
        btn.classList.remove('compare-active');
        btn.title = '添加到对比';
    });
    
    showShortcutHint('对比列表已清空');
}

// 开始对比
function startCompare() {
    if (compareItems.length < 2) {
        showShortcutHint('请至少选择2个病害进行对比');
        return;
    }
    
    const compareDiseases = compareItems.map(id => 
        diseasesData.find(d => d.id === id)
    ).filter(Boolean);
    
    document.getElementById('compareModalTitle').innerHTML = `
        <i class="fas fa-balance-scale"></i> 病害对比分析 (${compareDiseases.length}个)
    `;
    
    const compareModalBody = document.getElementById('compareModalBody');
    compareModalBody.innerHTML = buildCompareTable(compareDiseases);
    
    compareModal.style.display = 'flex';
}

// 构建对比表格
function buildCompareTable(diseases) {
    return `
        <div class="compare-table-container" id="printableContent">
            <table class="compare-table">
                <thead>
                    <tr>
                        <th>对比项目</th>
                        ${diseases.map(d => `<th>${d.name}<br><small>${d.crop}</small></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>病害名称</th>
                        ${diseases.map(d => `<td>${d.name}</td>`).join('')}
                    </tr>
                    <tr>
                        <th>危害作物</th>
                        ${diseases.map(d => `<td>${d.crop}</td>`).join('')}
                    </tr>
                    <tr>
                        <th>病原菌</th>
                        ${diseases.map(d => `<td>${d.pathogen}</td>`).join('')}
                    </tr>
                    <tr>
                        <th>病原类型</th>
                        ${diseases.map(d => `<td>${d.pathogen_type || '未知'}</td>`).join('')}
                    </tr>
                    <tr>
                        <th>危害程度</th>
                        ${diseases.map(d => `
                            <td>
                                <span class="severity ${d.severity}">
                                    ${d.severity === 'high' ? '高危害' : 
                                      d.severity === 'medium' ? '中危害' : '低危害'}
                                </span>
                            </td>
                        `).join('')}
                    </tr>
                    <tr>
                        <th>识别准确率</th>
                        ${diseases.map(d => `<td>${d.recognition_accuracy || '90%'}</td>`).join('')}
                    </tr>
                    <tr>
                        <th>典型症状</th>
                        ${diseases.map(d => `<td>${d.symptoms.substring(0, 60)}...</td>`).join('')}
                    </tr>
                    <tr>
                        <th>防治方案数量</th>
                        ${diseases.map(d => `<td>${d.pesticides ? d.pesticides.length : 0}种</td>`).join('')}
                    </tr>
                    <tr class="highlight">
                        <th>主要防治药剂</th>
                        ${diseases.map(d => `
                            <td>
                                ${d.pesticides && d.pesticides.length > 0 ? 
                                  d.pesticides.slice(0, 2).map(p => `
                                    <div><strong>${p.name}</strong>: ${p.concentration}</div>
                                `).join('') : '无数据'}
                            </td>
                        `).join('')}
                    </tr>
                    <tr>
                        <th>安全间隔期</th>
                        ${diseases.map(d => `
                            <td>
                                ${d.pesticides && d.pesticides.length > 0 ? 
                                  d.pesticides.map(p => p.safety).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 
                                  '无数据'}
                            </td>
                        `).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="compare-actions" style="margin-top: 2rem;">
            <button onclick="printCompareTable()" class="btn-primary">
                <i class="fas fa-print"></i> 打印对比结果
            </button>
            <button onclick="clearCompare()" class="btn-secondary">
                <i class="fas fa-trash"></i> 清空对比列表
            </button>
        </div>
    `;
}

// 打印对比表格
function printCompareTable() {
    // 创建新的打印窗口
    const printWindow = window.open('', '_blank');
    
    // 获取要打印的内容
    const printableContent = document.getElementById('printableContent');
    
    if (!printableContent) {
        console.error('未找到可打印的内容');
        return;
    }
    
    // 获取对比模态框标题
    const modalTitle = document.getElementById('compareModalTitle').textContent;
    
    // 构建打印内容HTML
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>病害对比分析结果</title>
            <style>
                body {
                    font-family: 'Noto Sans SC', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 20px;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #4caf50;
                    padding-bottom: 15px;
                }
                .print-header h1 {
                    color: #2e7d32;
                    margin-bottom: 10px;
                    font-size: 24px;
                }
                .print-info {
                    color: #666;
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .compare-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                .compare-table th, .compare-table td {
                    padding: 12px;
                    text-align: left;
                    border: 1px solid #ddd;
                    vertical-align: top;
                    font-size: 14px;
                }
                .compare-table th {
                    background-color: #f5f5f5;
                    font-weight: 600;
                    color: #333;
                    min-width: 150px;
                }
                .compare-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .compare-table .highlight {
                    background-color: #e8f5e9;
                }
                .severity {
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 500;
                    display: inline-block;
                }
                .severity.high { background: #ffebee; color: #c62828; }
                .severity.medium { background: #fff3e0; color: #ef6c00; }
                .severity.low { background: #e8f5e9; color: #2e7d32; }
                .print-footer {
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
                @media print {
                    body {
                        padding: 10px;
                    }
                    .print-header h1 {
                        font-size: 20px;
                    }
                    .compare-table th, .compare-table td {
                        padding: 8px 10px;
                        font-size: 12px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>${modalTitle}</h1>
                <div class="print-info">打印时间: ${new Date().toLocaleString('zh-CN')}</div>
                <div class="print-info">智慧农业病害知识库 - 对比分析报告</div>
            </div>
            
            ${printableContent.innerHTML}
            
            <div class="print-footer">
                <p>本报告由智慧农业病害知识库生成</p>
                <p>© ${new Date().getFullYear()} 智慧农业大创项目 - 基于机器视觉的病虫识别与应用</p>
            </div>
            
            <script>
                // 页面加载完成后自动打印
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        // 打印完成后关闭窗口
                        setTimeout(function() {
                            window.close();
                        }, 1000);
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    // 写入打印内容
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// 显示收藏页面
function showFavorites() {
    // 更新导航栏活动状态
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const favoritesLink = document.getElementById('favoritesLink');
    if (favoritesLink) {
        favoritesLink.classList.add('active');
    }
    
    // 设置页面标题
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        pageHeader.innerHTML = `<i class="fas fa-star"></i> 已收藏病害 (${favorites.length}个)`;
    }
    
    // 过滤显示收藏的病害
    if (favorites.length === 0) {
        diseaseGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-star"></i>
                <h3>暂无收藏的病害</h3>
                <p>点击病害卡片上的 <i class="fas fa-star" style="color: #ff9800;"></i> 按钮添加收藏</p>
            </div>
        `;
        if (diseaseCount) diseaseCount.textContent = '0';
    } else {
        const favoriteDiseases = diseasesData.filter(disease => 
            favorites.includes(disease.id)
        );
        renderDiseases(favoriteDiseases);
        
        if (diseaseCount) {
            diseaseCount.textContent = favoriteDiseases.length;
        }
    }
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 显示所有病害
function showAllDiseases() {
    // 更新导航栏活动状态
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const homeLink = document.querySelector('.nav-links a[href="#home"]');
    if (homeLink) {
        homeLink.classList.add('active');
    }
    
    // 设置页面标题
    const pageHeader = document.querySelector('.page-header h1');
    if (pageHeader) {
        pageHeader.innerHTML = `<i class="fas fa-book-medical"></i> 农作物病害知识库`;
    }
    
    // 重置筛选并显示所有病害
    resetFilters();
    
    // 显示对比工具栏
    if (compareToolbar && compareItems.length > 0) {
        compareToolbar.style.display = 'block';
    }
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 主筛选函数
function filterDiseases() {
    console.log('开始过滤，条件:', {
        filter: currentFilter,
        search: currentSearch,
        totalData: diseasesData.length
    });
    
    let filtered = [...diseasesData];

    // 1. 先应用作物过滤
    if (currentFilter !== 'all') {
        const beforeFilter = filtered.length;
        filtered = filtered.filter(disease => {
            return disease.crop === currentFilter;
        });
        console.log(`作物过滤后: ${beforeFilter} -> ${filtered.length} 条`);
    }

    // 2. 再应用搜索过滤
    if (currentSearch && currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase().trim();
        const beforeSearch = filtered.length;
        
        filtered = enhancedSearch(searchTerm);
        
        // 确保只保留经过作物过滤后的结果
        if (currentFilter !== 'all') {
            filtered = filtered.filter(disease => disease.crop === currentFilter);
        }
        
        console.log(`搜索过滤后: ${beforeSearch} -> ${filtered.length} 条`);
        
        if (filtered.length === 0) {
            showShortcutHint(`未找到包含"${currentSearch}"的病害`);
        }
    }

    filteredDiseases = filtered;
    console.log('最终结果数量:', filteredDiseases.length);
    
    // 更新全局计数显示
    if (diseaseCount) {
        diseaseCount.textContent = filteredDiseases.length;
    }
    
    // 渲染结果
    renderDiseases(filteredDiseases);
    
    // 搜索完成后关闭搜索框
    if (currentSearch && searchOverlay && searchOverlay.classList.contains('show')) {
        closeSearch();
        currentSearch = '';
        if (searchInput) searchInput.value = '';
    }
}

// 打开搜索框
function openSearch() {
    if (searchOverlay) {
        searchOverlay.classList.add('show');
        if (searchInput) {
            searchInput.focus();
            showSearchSuggestions(searchInput.value);
        }
        if (searchTrigger) searchTrigger.classList.add('active');
        showShortcutHint('搜索框已打开，输入关键词后按回车搜索');
    }
}

// 关闭搜索框
function closeSearch() {
    if (searchOverlay) {
        searchOverlay.classList.remove('show');
        if (searchTrigger) searchTrigger.classList.remove('active');
        hideSearchSuggestions();
    }
}

// 执行搜索
function performSearch() {
    if (!searchInput) return;
    
    const searchValue = searchInput.value.trim();
    console.log('执行搜索:', searchValue);
    
    if (searchValue) {
        currentSearch = searchValue;
        addToSearchHistory(searchValue);
        filterDiseases();
        
        // 滚动到病害列表区域
        const diseaseSection = document.getElementById('diseases');
        if (diseaseSection) {
            window.scrollTo({
                top: diseaseSection.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    } else {
        resetFilters();
    }
    
    hideSearchSuggestions();
}

// 搜索历史管理
function addToSearchHistory(searchTerm) {
    if (!searchTerm.trim()) return;
    
    // 移除重复项
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== searchTerm.toLowerCase());
    
    // 添加到历史记录开头
    searchHistory.unshift(searchTerm);
    
    // 限制历史记录数量
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    // 保存到本地存储
    localStorage.setItem('disease_search_history', JSON.stringify(searchHistory));
}

// 获取热门搜索
function getPopularSearches() {
    // 基于数据统计的热门搜索
    const cropCounts = {};
    diseasesData.forEach(disease => {
        cropCounts[disease.crop] = (cropCounts[disease.crop] || 0) + 1;
    });
    
    const popularCrops = Object.keys(cropCounts)
        .sort((a, b) => cropCounts[b] - cropCounts[a])
        .slice(0, 3);
    
    const symptomKeywords = ['病斑', '霉层', '腐烂', '黄化', '斑点'];
    const popularKeywords = ['病害', '防治', '药剂', '症状', '识别'];
    
    return [
        ...popularCrops,
        ...symptomKeywords.slice(0, 2),
        ...popularKeywords.slice(0, 2),
        '番茄病害', '水稻', '霜霉病'
    ].slice(0, 8);
}

// 显示搜索建议下拉框
function showSearchSuggestions(searchTerm) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;
    
    if (!searchTerm.trim()) {
        // 显示热门搜索和搜索历史
        const popularSearches = getPopularSearches();
        
        suggestionsContainer.innerHTML = `
            <div class="suggestions-section">
                <div class="suggestions-header">
                    <i class="fas fa-fire"></i> 热门搜索
                </div>
                ${popularSearches.map(term => `
                    <div class="suggestion-item popular" data-term="${term}">
                        <i class="fas fa-search"></i> ${term}
                    </div>
                `).join('')}
            </div>
            <div class="suggestions-section">
                <div class="suggestions-header">
                    <i class="fas fa-history"></i> 搜索历史
                </div>
                ${searchHistory.length > 0 ? 
                    searchHistory.map(term => `
                        <div class="suggestion-item history" data-term="${term}">
                            <i class="fas fa-history"></i> ${term}
                            <button class="remove-suggestion" title="删除">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('') :
                    '<div class="suggestion-item empty">暂无搜索历史</div>'
                }
            </div>
        `;
        suggestionsContainer.style.display = 'block';
        return;
    }
    
    // 基于搜索词生成建议
    const suggestions = generateSearchSuggestions(searchTerm);
    
    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = `
            <div class="suggestion-item empty">
                <i class="fas fa-exclamation-circle"></i>
                暂无相关建议
            </div>
        `;
    } else {
        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-term="${suggestion.term}">
                <i class="fas fa-${suggestion.icon}"></i>
                <div class="suggestion-content">
                    <strong>${suggestion.term}</strong>
                    ${suggestion.description ? `<small>${suggestion.description}</small>` : ''}
                </div>
            </div>
        `).join('');
    }
    
    suggestionsContainer.style.display = 'block';
}

// 生成搜索建议
function generateSearchSuggestions(searchTerm) {
    const lowerTerm = searchTerm.toLowerCase();
    const suggestions = [];
    
    // 1. 病害名称建议
    const diseaseMatches = diseasesData.filter(d => 
        d.name.toLowerCase().includes(lowerTerm)
    ).slice(0, 3);
    
    diseaseMatches.forEach(disease => {
        suggestions.push({
            term: disease.name,
            description: `${disease.crop} - ${disease.pathogen ? disease.pathogen.split('(')[0] : '未知病原'}`,
            icon: 'leaf'
        });
    });
    
    // 2. 作物建议
    const cropMatches = [...new Set(diseasesData.map(d => d.crop))]
        .filter(crop => crop.toLowerCase().includes(lowerTerm))
        .slice(0, 2);
    
    cropMatches.forEach(crop => {
        const count = diseasesData.filter(d => d.crop === crop).length;
        suggestions.push({
            term: crop,
            description: `${count}种病害`,
            icon: 'seedling'
        });
    });
    
    // 3. 症状关键词建议
    const symptomKeywords = ['斑点', '腐烂', '枯萎', '黄化', '霉层', '病斑', '水渍状', '枯死'];
    const symptomMatches = symptomKeywords.filter(keyword => 
        keyword.includes(lowerTerm)
    ).slice(0, 2);
    
    symptomMatches.forEach(keyword => {
        suggestions.push({
            term: keyword,
            description: '常见症状',
            icon: 'stethoscope'
        });
    });
    
    // 4. 病原建议
    if (lowerTerm.length >= 2) {
        const pathogenMatches = diseasesData
            .filter(d => d.pathogen && d.pathogen.toLowerCase().includes(lowerTerm))
            .slice(0, 2);
        
        pathogenMatches.forEach(disease => {
            suggestions.push({
                term: disease.pathogen.split('(')[0].trim(),
                description: `引起${disease.name}`,
                icon: 'virus'
            });
        });
    }
    
    return suggestions.slice(0, 5); // 最多返回5条建议
}

// 隐藏搜索建议
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
        }, 200);
    }
}

// 显示快捷键提示
function showShortcutHint(message) {
    // 移除现有的提示
    const existingHint = document.querySelector('.shortcut-hint');
    if (existingHint) {
        existingHint.remove();
    }
    
    // 创建新的提示
    const hint = document.createElement('div');
    hint.className = 'shortcut-hint';
    hint.textContent = message;
    document.body.appendChild(hint);
    
    // 显示动画
    setTimeout(() => hint.classList.add('show'), 10);
    
    // 3秒后自动移除
    setTimeout(() => {
        hint.classList.remove('show');
        setTimeout(() => hint.remove(), 300);
    }, 3000);
}

// 设置事件监听器
function setupEventListeners() {
    console.log('设置事件监听器');
    setupFilterListeners();
    
    // 图像库事件监听器
    setupImageLibraryListeners();
    
    // 搜索触发器
    if (searchTrigger) {
        searchTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openSearch();
        });
    }

    // 关闭搜索按钮
    if (searchClose) {
        searchClose.addEventListener('click', closeSearch);
    }

    // 点击搜索覆盖层外部关闭
    if (searchOverlay) {
        searchOverlay.addEventListener('click', (e) => {
            if (e.target === searchOverlay) {
                closeSearch();
            }
        });
    }

    // 搜索按钮
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    // 搜索输入框回车键
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // 过滤标签
    if (filterTags.length > 0) {
        filterTags.forEach(tag => {
            tag.addEventListener('click', () => {
                filterTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilter = tag.getAttribute('data-crop');
                filterDiseases();
            });
        });
    }

    // 热门关键词标签
    if (keywordTags.length > 0) {
        keywordTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const keyword = tag.getAttribute('data-keyword');
                if (searchInput) {
                    searchInput.value = keyword;
                    currentSearch = keyword;
                    performSearch();
                }
            });
        });
    }

    // 模态框关闭按钮
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            if (diseaseModal) diseaseModal.style.display = 'none';
            if (compareModal) compareModal.style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    if (diseaseModal) {
        diseaseModal.addEventListener('click', (e) => {
            if (e.target === diseaseModal) {
                diseaseModal.style.display = 'none';
            }
        });
    }
    
    if (compareModal) {
        compareModal.addEventListener('click', (e) => {
            if (e.target === compareModal) {
                compareModal.style.display = 'none';
            }
        });
    }

    // 移动端菜单按钮
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (navLinks) navLinks.classList.toggle('active');
        });
    }

    // 导航链接点击
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            // 搜索链接特殊处理
            if (link.id === 'searchTrigger') {
                e.preventDefault();
                openSearch();
                return;
            }
        
            // 收藏链接处理
            if (link.id === 'favoritesLink') {
                e.preventDefault();
                showFavorites();
                return;
            }
            
            // 图像库链接处理
            if (link.id === 'imageGalleryTrigger') {
                e.preventDefault();
                openImageGallery();
                return;
            }
            
            // 病害库链接处理
            const href = link.getAttribute('href');
            if (href === '#diseases') {
                e.preventDefault();
                // 重置导航栏活动状态
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                
                // 更新页面状态
                currentPage = 'home';
                
                // 重置页面标题
                const pageHeader = document.querySelector('.page-header h1');
                if (pageHeader) {
                    pageHeader.innerHTML = `<i class="fas fa-book-medical"></i> 农作物病害知识库`;
                }
            
                // 显示所有病害
                resetFilters();
                
                // 显示对比工具栏
                if (compareToolbar && compareItems.length > 0) {
                    compareToolbar.style.display = 'block';
                }
                
                // 滚动到病害区域
                const targetElement = document.getElementById('diseases');
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
                return;
            }
        
            // 首页链接处理
            if (href === '#home') {
                e.preventDefault();
                // 重置导航栏活动状态
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                // 更新页面状态
                currentPage = 'home';

                // 显示所有病害
                resetFilters();
                // 显示对比工具栏
                if (compareToolbar && compareItems.length > 0) {
                    compareToolbar.style.display = 'block';
                }

                // 滚动到顶部
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            // 关于链接处理（锚点跳转）
            if (href === '#about') {
                // 允许默认的锚点跳转行为
                // 只更新导航状态
                document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                return;
            }
            
            // 更新活动状态
            document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            
            // 移动端点击后关闭菜单
            if (window.innerWidth <= 768 && navLinks) {
                navLinks.classList.remove('active');
            }
        });
    });

    // 回到顶部按钮
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 滚动显示回到顶部按钮
    window.addEventListener('scroll', () => {
        if (backToTopBtn) {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }
    });

    // 对比相关按钮
    if (clearCompareBtn) {
        clearCompareBtn.addEventListener('click', clearCompare);
    }
    
    if (startCompareBtn) {
        startCompareBtn.addEventListener('click', startCompare);
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // ESC 关闭模态框和搜索框
        if (e.key === 'Escape') {
            if (diseaseModal && diseaseModal.style.display === 'flex') {
                diseaseModal.style.display = 'none';
            }
            if (compareModal && compareModal.style.display === 'flex') {
                compareModal.style.display = 'none';
            }
            if (imageGalleryModal && imageGalleryModal.style.display === 'flex') {
                closeImageGallery();
            }
            if (imageViewerModal && imageViewerModal.style.display === 'flex') {
                closeImageViewer();
            }
            if (searchOverlay && searchOverlay.classList.contains('show')) {
                closeSearch();
                showShortcutHint('搜索框已关闭');
            }
            if (filterOverlay && filterOverlay.classList.contains('show')) {
                closeFilter();
            }
        }
        
        // Ctrl+F 或 Cmd+F 打开搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearch();
        }
        
        // 按 / 打开搜索框（排除输入框内）
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && 
            document.activeElement !== searchInput && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            openSearch();
        }
        
        // 图像查看器快捷键
        if (imageViewerModal && imageViewerModal.style.display === 'flex') {
            switch(e.key) {
                case 'ArrowLeft': navigateImage(-1); break;
                case 'ArrowRight': navigateImage(1); break;
                case '+': case '=': 
                    e.preventDefault();
                    setImageZoom(currentZoom + 0.1);
                    break;
                case '-': case '_': 
                    e.preventDefault();
                    setImageZoom(currentZoom - 0.1);
                    break;
                case ' ': 
                    e.preventDefault();
                    toggleSlideshow();
                    break;
                case 'F': case 'f': 
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'D': case 'd': 
                    e.preventDefault();
                    downloadCurrentImage();
                    break;
            }
        }
    });

    // 搜索框获得焦点时显示提示
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.setAttribute('placeholder', '输入关键词后按回车搜索...');
            showSearchSuggestions(searchInput.value);
        });

        searchInput.addEventListener('blur', () => {
            searchInput.setAttribute('placeholder', '搜索病害名称、症状或作物类型... (按回车搜索)');
            setTimeout(() => hideSearchSuggestions(), 300);
        });
        
        // 搜索建议点击事件
        searchInput.addEventListener('input', (e) => {
            showSearchSuggestions(e.target.value);
        });
    }

    // 搜索建议点击事件委托
    document.addEventListener('click', (e) => {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer || !suggestionsContainer.style.display || 
            suggestionsContainer.style.display === 'none') return;
        
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const term = suggestionItem.dataset.term;
            if (term && searchInput) {
                searchInput.value = term;
                currentSearch = term;
                performSearch();
            }
        }
        
        // 移除搜索历史
        const removeBtn = e.target.closest('.remove-suggestion');
        if (removeBtn) {
            e.stopPropagation();
            const suggestionItem = removeBtn.closest('.suggestion-item');
            if (suggestionItem) {
                const term = suggestionItem.dataset.term;
                if (term) {
                    searchHistory = searchHistory.filter(item => item !== term);
                    localStorage.setItem('disease_search_history', JSON.stringify(searchHistory));
                    showSearchSuggestions(searchInput ? searchInput.value : '');
                }
            }
        }
    });

    // 图片加载错误处理
    document.addEventListener('error', (e) => {
        if (e.target.classList.contains('disease-image')) {
            e.target.style.display = 'none';
            if (e.target.nextElementSibling) {
                e.target.nextElementSibling.style.display = 'flex';
            }
        }
    }, true);

    // 图片加载成功
    document.addEventListener('load', (e) => {
        if (e.target.classList.contains('disease-image')) {
            e.target.classList.add('loaded');
        }
    }, true);
    
    // 窗口点击关闭搜索建议
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchSuggestions') && 
            !e.target.closest('#searchInput') && 
            !e.target.closest('.search-btn')) {
            hideSearchSuggestions();
        }
    });
    
    // 收藏链接点击事件
    if (favoritesLink) {
        favoritesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showFavorites();
        });
    }
    
    // 图像库快速入口按钮
    if (viewAllImagesBtn) {
        viewAllImagesBtn.addEventListener('click', openImageGallery);
    }
    
    if (searchByImageBtn) {
        searchByImageBtn.addEventListener('click', () => {
            openImageGallery();
            setTimeout(() => {
                const searchInput = document.getElementById('imageSearch');
                if (searchInput) {
                    searchInput.focus();
                    showShortcutHint('在搜索框中输入病害名称或作物名称');
                }
            }, 300);
        });
    }
}

// 设置图像库事件监听器
function setupImageLibraryListeners() {
    // 图像库触发器
    if (imageGalleryTrigger) {
        imageGalleryTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            openImageGallery();
        });
    }
    
    // 关闭图像库
    const closeGalleryBtn = document.getElementById('closeGallery');
    if (closeGalleryBtn) {
        closeGalleryBtn.addEventListener('click', closeImageGallery);
    }
    
    // 关闭图像查看器
    const closeImageViewerBtn = document.getElementById('closeImageViewer');
    if (closeImageViewerBtn) {
        closeImageViewerBtn.addEventListener('click', closeImageViewer);
    }
    
    // 图像库筛选按钮
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyImageFilters);
    }
    
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetImageFilters);
    }
    
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearImageSearch);
    }
    
    // 图像库搜索框
    const imageSearchInput = document.getElementById('imageSearch');
    if (imageSearchInput) {
        imageSearchInput.addEventListener('input', (e) => {
            clearTimeout(imageSearchInput.searchTimeout);
            imageSearchInput.searchTimeout = setTimeout(() => {
                applyImageFilters();
            }, 300);
        });
        
        imageSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyImageFilters();
            }
        });
    }
    
    // 图像库操作按钮
    const viewSelectedBtn = document.getElementById('viewSelected');
    if (viewSelectedBtn) {
        viewSelectedBtn.addEventListener('click', viewSelectedImages);
    }
    
    const clearSelectedBtn = document.getElementById('clearSelected');
    if (clearSelectedBtn) {
        clearSelectedBtn.addEventListener('click', clearSelectedImages);
    }
    
    const startSlideshowBtn = document.getElementById('startSlideshow');
    if (startSlideshowBtn) {
        startSlideshowBtn.addEventListener('click', () => {
            if (selectedImageIds.size === 0) {
                showShortcutHint('请先选择要播放的图像');
                return;
            }
            
            viewSelectedImages();
            setTimeout(() => {
                if (filteredImages.length > 0) {
                    openImage(filteredImages[0].id);
                    setTimeout(() => {
                        startSlideshow();
                    }, 500);
                }
            }, 300);
        });
    }
    
    // 图像查看器控制按钮
    const prevImageBtn = document.getElementById('prevImage');
    if (prevImageBtn) {
        prevImageBtn.addEventListener('click', () => navigateImage(-1));
    }
    
    const nextImageBtn = document.getElementById('nextImage');
    if (nextImageBtn) {
        nextImageBtn.addEventListener('click', () => navigateImage(1));
    }
    
    const zoomInBtn = document.getElementById('zoomIn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => setImageZoom(currentZoom + 0.1));
    }
    
    const zoomOutBtn = document.getElementById('zoomOut');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => setImageZoom(currentZoom - 0.1));
    }
    
    const fullscreenBtn = document.getElementById('toggleFullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    const downloadBtn = document.getElementById('downloadImage');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCurrentImage);
    }
    
    const toggleSlideshowBtn = document.getElementById('toggleSlideshow');
    if (toggleSlideshowBtn) {
        toggleSlideshowBtn.addEventListener('click', toggleSlideshow);
    }
    
    const slideshowSpeedInput = document.getElementById('slideshowSpeed');
    if (slideshowSpeedInput) {
        slideshowSpeedInput.addEventListener('input', (e) => {
            const speedValue = document.getElementById('speedValue');
            if (speedValue) {
                speedValue.textContent = `${e.target.value}秒`;
            }
        });
    }
    
    // 缩放级别按钮
    document.querySelectorAll('.zoom-level-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const zoom = parseFloat(e.target.dataset.zoom);
            setImageZoom(zoom);
        });
    });
    
    // 返回图库按钮
    const viewInGalleryBtn = document.getElementById('viewInGallery');
    if (viewInGalleryBtn) {
        viewInGalleryBtn.addEventListener('click', () => {
            closeImageViewer();
            openImageGallery();
        });
    }
    
    // 对比相似病害按钮
    const compareWithSimilarBtn = document.getElementById('compareWithSimilar');
    if (compareWithSimilarBtn) {
        compareWithSimilarBtn.addEventListener('click', () => {
            const currentImage = filteredImages[currentImageIndex];
            if (!currentImage) return;
            
            // 查找相似病害
            const similarImages = imagesData.images.filter(img => 
                img.crop === currentImage.crop && 
                img.disease !== currentImage.disease && 
                !img.is_healthy
            ).slice(0, 3);
            
            if (similarImages.length > 0) {
                showShortcutHint(`找到了 ${similarImages.length} 张相似病害图像`);
                // 这里可以实现对比功能
            } else {
                showShortcutHint('未找到相似病害图像');
            }
        });
    }
}

// 打开图像库
function openImageGallery() {
    // 重置筛选状态
    filteredImages = [...imagesData.images];
    currentImagePage = 1;
    selectedImageIds.clear();
    
    // 更新UI
    populateImageFilters();
    applyImageFilters();
    
    // 显示模态框
    imageGalleryModal.style.display = 'flex';
}

// 关闭图像库
function closeImageGallery() {
    imageGalleryModal.style.display = 'none';
}

// 关闭图像查看器
function closeImageViewer() {
    stopSlideshow();
    imageViewerModal.style.display = 'none';
}

// 按病害筛选图像
function filterImagesByDisease(diseaseName) {
    openImageGallery();
    
    setTimeout(() => {
        const diseaseSelect = document.getElementById('filterDisease');
        if (diseaseSelect) {
            // 尝试找到完全匹配的选项
            let foundOption = false;
            for (let option of diseaseSelect.options) {
                if (option.value === diseaseName || 
                    diseaseName.includes(option.value) || 
                    option.value.includes(diseaseName)) {
                    diseaseSelect.value = option.value;
                    foundOption = true;
                    break;
                }
            }
            
            // 如果没有找到完全匹配，选择第一个包含关键词的选项
            if (!foundOption) {
                for (let option of diseaseSelect.options) {
                    if (option.value !== 'all' && 
                        (diseaseName.includes(option.value) || option.value.includes(diseaseName))) {
                        diseaseSelect.value = option.value;
                        foundOption = true;
                        break;
                    }
                }
            }
            
            applyImageFilters();
            
            // 如果没有找到匹配的病害，显示提示
            if (!foundOption) {
                setTimeout(() => {
                    showShortcutHint(`在图像库中未找到"${diseaseName}"的病害图像`);
                }, 500);
            }
        }
    }, 300);
}

// 按作物筛选图像
function filterImagesByCrop(cropName) {
    openImageGallery();
    
    setTimeout(() => {
        const cropSelect = document.getElementById('filterCrop');
        if (cropSelect) {
            cropSelect.value = cropName;
            applyImageFilters();
        }
    }, 300);
}

// 监听视口变化，重新检查图片懒加载
window.addEventListener('resize', () => {
    initImagesLazyLoad();
});

// 监听滚动，更新图片懒加载和回到顶部按钮
window.addEventListener('scroll', () => {
    initImagesLazyLoad();
});

// 暴露一些函数给全局作用域，用于HTML中的调用
window.printCompareTable = printCompareTable;
window.clearCompare = clearCompare;
window.showDiseaseDetails = showDiseaseDetails;
window.resetFilters = resetFilters;
window.initKnowledgeGraph = initKnowledgeGraph;
window.showGraphNodeDetail = showGraphNodeDetail;
window.closeGraphNodeDetail = closeGraphNodeDetail;
window.showAllDiseases = showAllDiseases;
window.showFavorites = showFavorites;
window.openImageGallery = openImageGallery;
window.closeImageGallery = closeImageGallery;
window.openImage = openImage;
window.closeImageViewer = closeImageViewer;
window.navigateImage = navigateImage;
window.setImageZoom = setImageZoom;
window.toggleFullscreen = toggleFullscreen;
window.downloadCurrentImage = downloadCurrentImage;
window.toggleSlideshow = toggleSlideshow;
window.toggleImageSelect = toggleImageSelect;
window.clearSelectedImages = clearSelectedImages;
window.viewSelectedImages = viewSelectedImages;
window.applyImageFilters = applyImageFilters;
window.resetImageFilters = resetImageFilters;
window.clearImageSearch = clearImageSearch;
window.changeImagePage = changeImagePage;
window.filterImagesByDisease = filterImagesByDisease;
window.filterImagesByCrop = filterImagesByCrop;
window.compareImage = compareImage;