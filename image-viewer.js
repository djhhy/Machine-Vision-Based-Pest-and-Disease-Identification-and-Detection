// image-viewer.js - 植物病害图像查看器模块
const IMAGE_VIEWER_CONFIG = {
    THUMBNAIL_SIZE: 200,
    PREVIEW_SIZE: 800,
    IMAGES_PER_PAGE: 12,
    AUTO_SLIDE_INTERVAL: 5000,
    ZOOM_LEVELS: [1, 1.5, 2, 3]
};

class ImageViewer {
    constructor() {
        this.imagesData = null;
        this.filteredImages = [];
        this.currentPage = 1;
        this.currentFilters = {
            crop: 'all',
            disease: 'all',
            type: 'all',
            health: 'all'
        };
        this.selectedImages = new Set();
        this.currentSlideIndex = 0;
        this.currentZoom = 1;
        
        // DOM元素
        this.dom = {
            viewerModal: null,
            galleryGrid: null,
            imageModal: null,
            filterPanel: null,
            searchInput: null,
            currentImage: null,
            prevBtn: null,
            nextBtn: null,
            zoomInBtn: null,
            zoomOutBtn: null,
            fullscreenBtn: null,
            slideshowBtn: null,
            downloadBtn: null
        };
        
        this.init();
    }

    async init() {
        await this.loadImagesData();
        this.createViewerElements();
        this.setupEventListeners();
        console.log('🖼️ 图像查看器初始化完成');
    }

    async loadImagesData() {
        try {
            const response = await fetch('images/frontend_images.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            this.imagesData = data;
            this.filteredImages = [...data.images];
            
            console.log(`✅ 加载了 ${data.images.length} 张病害图像`);
            console.log(`🌿 包含作物: ${data.crops.join(', ')}`);
            console.log(`🦠 包含病害: ${data.diseases.length} 种`);
            
            return data;
        } catch (error) {
            console.error('❌ 加载图像数据失败:', error);
            
            // 使用备用数据
            this.imagesData = this.getFallbackData();
            this.filteredImages = [...this.imagesData.images];
            return this.imagesData;
        }
    }

    getFallbackData() {
        return {
            images: [
                {
                    id: 1,
                    crop: '番茄',
                    disease: '早疫病',
                    thumbnail: 'images/thumbnails/Tomato/Tomato_Early_blight_1.jpg',
                    preview: 'images/preview/Tomato/Tomato_Early_blight_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 2,
                    crop: '番茄',
                    disease: '晚疫病',
                    thumbnail: 'images/thumbnails/Tomato/Tomato_Late_blight_1.jpg',
                    preview: 'images/preview/Tomato/Tomato_Late_blight_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 3,
                    crop: '番茄',
                    disease: '叶霉病',
                    thumbnail: 'images/thumbnails/Tomato/Tomato_Leaf_Mold_1.jpg',
                    preview: 'images/preview/Tomato/Tomato_Leaf_Mold_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 4,
                    crop: '番茄',
                    disease: '细菌性斑点病',
                    thumbnail: 'images/thumbnails/Tomato/Tomato_Bacterial_spot_1.jpg',
                    preview: 'images/preview/Tomato/Tomato_Bacterial_spot_1.jpg',
                    is_healthy: false,
                    type: '细菌'
                },
                {
                    id: 5,
                    crop: '番茄',
                    disease: '健康',
                    thumbnail: 'images/thumbnails/Tomato/Tomato_healthy_1.jpg',
                    preview: 'images/preview/Tomato/Tomato_healthy_1.jpg',
                    is_healthy: true,
                    type: '健康'
                },
                {
                    id: 6,
                    crop: '玉米',
                    disease: '北方叶枯病',
                    thumbnail: 'images/thumbnails/Corn/Corn_Northern_Leaf_Blight_1.jpg',
                    preview: 'images/preview/Corn/Corn_Northern_Leaf_Blight_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 7,
                    crop: '玉米',
                    disease: '普通锈病',
                    thumbnail: 'images/thumbnails/Corn/Corn_Common_rust_1.jpg',
                    preview: 'images/preview/Corn/Corn_Common_rust_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 8,
                    crop: '玉米',
                    disease: '灰斑病',
                    thumbnail: 'images/thumbnails/Corn/Corn_Cercospora_leaf_spot_Gray_leaf_spot_1.jpg',
                    preview: 'images/preview/Corn/Corn_Cercospora_leaf_spot_Gray_leaf_spot_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 9,
                    crop: '马铃薯',
                    disease: '早疫病',
                    thumbnail: 'images/thumbnails/Potato/Potato_Early_blight_1.jpg',
                    preview: 'images/preview/Potato/Potato_Early_blight_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                },
                {
                    id: 10,
                    crop: '马铃薯',
                    disease: '晚疫病',
                    thumbnail: 'images/thumbnails/Potato/Potato_Late_blight_1.jpg',
                    preview: 'images/preview/Potato/Potato_Late_blight_1.jpg',
                    is_healthy: false,
                    type: '真菌'
                }
            ],
            crops: ['番茄', '玉米', '马铃薯', '葡萄', '苹果', '甜椒'],
            diseases: ['早疫病', '晚疫病', '叶霉病', '细菌性斑点病', '健康', '北方叶枯病', '普通锈病', '灰斑病']
        };
    }

    createViewerElements() {
        // 创建图像库模态框
        const galleryModal = document.createElement('div');
        galleryModal.className = 'modal image-gallery-modal';
        galleryModal.id = 'imageGalleryModal';
        galleryModal.innerHTML = `
            <div class="modal-content" style="max-width: 1400px;">
                <div class="modal-header">
                    <h2><i class="fas fa-images"></i> 病害图像库</h2>
                    <div class="modal-header-actions">
                        <button class="btn-secondary" id="closeGallery">
                            <i class="fas fa-times"></i> 关闭
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="gallery-controls">
                        <div class="gallery-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="imageSearch" placeholder="搜索作物或病害...">
                            <button class="btn-small" id="clearSearch">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="gallery-filters">
                            <div class="filter-group">
                                <label><i class="fas fa-seedling"></i> 作物:</label>
                                <select id="filterCrop">
                                    <option value="all">全部作物</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label><i class="fas fa-virus"></i> 病害:</label>
                                <select id="filterDisease">
                                    <option value="all">全部病害</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label><i class="fas fa-filter"></i> 类型:</label>
                                <select id="filterType">
                                    <option value="all">全部类型</option>
                                    <option value="真菌">真菌病害</option>
                                    <option value="细菌">细菌病害</option>
                                    <option value="病毒">病毒病害</option>
                                    <option value="虫害">虫害</option>
                                    <option value="健康">健康植株</option>
                                </select>
                            </div>
                            <button class="btn-primary" id="applyFilters">
                                <i class="fas fa-filter"></i> 应用筛选
                            </button>
                            <button class="btn-secondary" id="resetFilters">
                                <i class="fas fa-redo"></i> 重置
                            </button>
                        </div>
                    </div>
                    
                    <div class="gallery-stats">
                        <span><i class="fas fa-image"></i> 总数: <strong id="totalImages">0</strong></span>
                        <span><i class="fas fa-filter"></i> 筛选: <strong id="filteredImages">0</strong></span>
                        <span><i class="fas fa-eye"></i> 已选: <strong id="selectedImages">0</strong></span>
                    </div>
                    
                    <div class="gallery-grid" id="galleryGrid">
                        <!-- 图像将通过JS动态加载 -->
                    </div>
                    
                    <div class="gallery-pagination" id="galleryPagination">
                        <!-- 分页控件 -->
                    </div>
                    
                    <div class="gallery-actions">
                        <button class="btn-primary" id="viewSelected">
                            <i class="fas fa-eye"></i> 查看选中
                        </button>
                        <button class="btn-secondary" id="clearSelected">
                            <i class="fas fa-trash"></i> 清除选择
                        </button>
                        <button class="btn-primary" id="startSlideshow">
                            <i class="fas fa-play"></i> 幻灯片播放
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(galleryModal);
        this.dom.viewerModal = galleryModal;

        // 创建大图查看模态框
        const imageModal = document.createElement('div');
        imageModal.className = 'modal image-viewer-modal';
        imageModal.id = 'imageViewerModal';
        imageModal.innerHTML = `
            <div class="modal-content" style="max-width: 1200px;">
                <div class="modal-header">
                    <h2 id="imageTitle">病害图像查看</h2>
                    <div class="modal-header-actions">
                        <button class="image-nav-btn" id="prevImage" title="上一张">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span id="imageCounter">1 / 10</span>
                        <button class="image-nav-btn" id="nextImage" title="下一张">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="image-action-btn" id="zoomIn" title="放大">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="image-action-btn" id="zoomOut" title="缩小">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="image-action-btn" id="toggleFullscreen" title="全屏">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="image-action-btn" id="downloadImage" title="下载">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="image-action-btn" id="closeImageViewer" title="关闭">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="image-viewer-container">
                        <div class="image-display-area" id="imageDisplayArea">
                            <img id="currentImageView" src="" alt="病害图像">
                            <div class="image-loading" id="imageLoading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <p>加载图像中...</p>
                            </div>
                        </div>
                        
                        <div class="image-info-panel">
                            <div class="image-info-section">
                                <h3><i class="fas fa-info-circle"></i> 图像信息</h3>
                                <div class="info-item">
                                    <strong>作物:</strong>
                                    <span id="infoCrop">番茄</span>
                                </div>
                                <div class="info-item">
                                    <strong>病害:</strong>
                                    <span id="infoDisease">早疫病</span>
                                </div>
                                <div class="info-item">
                                    <strong>病害类型:</strong>
                                    <span id="infoType" class="disease-type-tag">真菌</span>
                                </div>
                                <div class="info-item">
                                    <strong>健康状态:</strong>
                                    <span id="infoHealth" class="health-status healthy">健康</span>
                                </div>
                                <div class="info-item">
                                    <strong>图像ID:</strong>
                                    <span id="infoId">1</span>
                                </div>
                            </div>
                            
                            <div class="image-info-section">
                                <h3><i class="fas fa-clipboard-list"></i> 识别特征</h3>
                                <div class="recognition-features" id="recognitionFeatures">
                                    <p>基于机器视觉识别系统提取的特征信息...</p>
                                </div>
                            </div>
                            
                            <div class="image-info-section">
                                <h3><i class="fas fa-cogs"></i> 图像控制</h3>
                                <div class="control-group">
                                    <label>缩放级别:</label>
                                    <div class="zoom-levels">
                                        ${IMAGE_VIEWER_CONFIG.ZOOM_LEVELS.map(level => 
                                            `<button class="zoom-level-btn ${level === 1 ? 'active' : ''}" 
                                                    data-zoom="${level}">${level}x</button>`
                                        ).join('')}
                                    </div>
                                </div>
                                <div class="control-group">
                                    <label>幻灯片播放:</label>
                                    <button class="btn-small" id="toggleSlideshow">
                                        <i class="fas fa-play"></i> 开始播放
                                    </button>
                                    <input type="range" id="slideshowSpeed" min="1" max="10" value="5">
                                    <span id="speedValue">5秒</span>
                                </div>
                            </div>
                            
                            <div class="image-actions">
                                <button class="btn-primary" id="compareWithSimilar">
                                    <i class="fas fa-balance-scale"></i> 对比相似病害
                                </button>
                                <button class="btn-secondary" id="viewInGallery">
                                    <i class="fas fa-images"></i> 返回图库
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="thumbnail-strip" id="thumbnailStrip">
                        <!-- 缩略图条 -->
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(imageModal);
        this.dom.imageModal = imageModal;

        // 缓存DOM元素
        this.cacheDOMElements();
    }

    cacheDOMElements() {
        this.dom.galleryGrid = document.getElementById('galleryGrid');
        this.dom.currentImage = document.getElementById('currentImageView');
        this.dom.prevBtn = document.getElementById('prevImage');
        this.dom.nextBtn = document.getElementById('nextImage');
        this.dom.zoomInBtn = document.getElementById('zoomIn');
        this.dom.zoomOutBtn = document.getElementById('zoomOut');
        this.dom.fullscreenBtn = document.getElementById('toggleFullscreen');
        this.dom.slideshowBtn = document.getElementById('toggleSlideshow');
        this.dom.downloadBtn = document.getElementById('downloadImage');
        this.dom.filterPanel = {
            crop: document.getElementById('filterCrop'),
            disease: document.getElementById('filterDisease'),
            type: document.getElementById('filterType'),
            search: document.getElementById('imageSearch')
        };
    }

    setupEventListeners() {
        // 图库筛选事件
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFilters')?.addEventListener('click', () => this.resetFilters());
        document.getElementById('clearSearch')?.addEventListener('click', () => this.clearSearch());
        
        // 搜索框事件
        this.dom.filterPanel.search?.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.dom.filterPanel.search?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        
        // 大图查看事件
        this.dom.prevBtn?.addEventListener('click', () => this.navigateImage(-1));
        this.dom.nextBtn?.addEventListener('click', () => this.navigateImage(1));
        this.dom.zoomInBtn?.addEventListener('click', () => this.zoomImage(0.1));
        this.dom.zoomOutBtn?.addEventListener('click', () => this.zoomImage(-0.1));
        this.dom.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
        this.dom.downloadBtn?.addEventListener('click', () => this.downloadCurrentImage());
        
        // 关闭按钮
        document.getElementById('closeGallery')?.addEventListener('click', () => this.closeGallery());
        document.getElementById('closeImageViewer')?.addEventListener('click', () => this.closeImageViewer());
        
        // 幻灯片控制
        document.getElementById('toggleSlideshow')?.addEventListener('click', () => this.toggleSlideshow());
        document.getElementById('slideshowSpeed')?.addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = `${e.target.value}秒`;
        });
        
        // 缩放级别按钮
        document.querySelectorAll('.zoom-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const zoom = parseFloat(e.target.dataset.zoom);
                this.setZoomLevel(zoom);
            });
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (this.dom.imageModal.style.display === 'flex') {
                switch(e.key) {
                    case 'ArrowLeft': this.navigateImage(-1); break;
                    case 'ArrowRight': this.navigateImage(1); break;
                    case '+': case '=': this.zoomImage(0.1); break;
                    case '-': case '_': this.zoomImage(-0.1); break;
                    case 'Escape': this.closeImageViewer(); break;
                    case 'F': case 'f': this.toggleFullscreen(); break;
                    case ' ': this.toggleSlideshow(); break;
                }
            }
        });
    }

    // 筛选功能
    populateFilters() {
        if (!this.imagesData) return;
        
        // 填充作物筛选
        const cropSelect = this.dom.filterPanel.crop;
        cropSelect.innerHTML = '<option value="all">全部作物</option>';
        this.imagesData.crops.forEach(crop => {
            const option = document.createElement('option');
            option.value = crop;
            option.textContent = crop;
            cropSelect.appendChild(option);
        });
        
        // 填充病害筛选
        const diseaseSelect = this.dom.filterPanel.disease;
        diseaseSelect.innerHTML = '<option value="all">全部病害</option>';
        this.imagesData.diseases.forEach(disease => {
            const option = document.createElement('option');
            option.value = disease;
            option.textContent = disease;
            diseaseSelect.appendChild(option);
        });
    }

    applyFilters() {
        const crop = this.dom.filterPanel.crop.value;
        const disease = this.dom.filterPanel.disease.value;
        const type = this.dom.filterPanel.type.value;
        const searchTerm = this.dom.filterPanel.search.value.toLowerCase();
        
        this.currentFilters = { crop, disease, type };
        
        // 应用筛选
        this.filteredImages = this.imagesData.images.filter(image => {
            // 作物筛选
            if (crop !== 'all' && image.crop !== crop) return false;
            
            // 病害筛选
            if (disease !== 'all' && image.disease !== disease) return false;
            
            // 类型筛选
            if (type !== 'all' && image.type !== type) {
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
        
        // 重置分页
        this.currentPage = 1;
        
        // 更新UI
        this.renderGallery();
        this.updateStats();
    }

    resetFilters() {
        this.dom.filterPanel.crop.value = 'all';
        this.dom.filterPanel.disease.value = 'all';
        this.dom.filterPanel.type.value = 'all';
        this.dom.filterPanel.search.value = '';
        this.selectedImages.clear();
        
        this.applyFilters();
    }

    clearSearch() {
        this.dom.filterPanel.search.value = '';
        this.applyFilters();
    }

    handleSearch(term) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }

    // 渲染功能
    renderGallery() {
        if (!this.dom.galleryGrid) return;
        
        const startIndex = (this.currentPage - 1) * IMAGE_VIEWER_CONFIG.IMAGES_PER_PAGE;
        const endIndex = startIndex + IMAGE_VIEWER_CONFIG.IMAGES_PER_PAGE;
        const pageImages = this.filteredImages.slice(startIndex, endIndex);
        
        // 生成HTML
        const html = pageImages.map(image => {
            const isSelected = this.selectedImages.has(image.id);
            const healthClass = image.is_healthy ? 'healthy' : 'diseased';
            const typeClass = image.type === '健康' ? 'type-healthy' : `type-${image.type}`;
            
            return `
                <div class="gallery-item ${isSelected ? 'selected' : ''}" 
                     data-id="${image.id}" 
                     data-crop="${image.crop}"
                     data-disease="${image.disease}">
                    <div class="gallery-item-select">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="window.imageViewer.toggleSelect(${image.id})">
                    </div>
                    <div class="gallery-item-image" onclick="window.imageViewer.openImage(${image.id})">
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
                            <button class="btn-small" onclick="event.stopPropagation(); window.imageViewer.openImage(${image.id})">
                                <i class="fas fa-eye"></i> 查看
                            </button>
                            <button class="btn-small" onclick="event.stopPropagation(); window.imageViewer.compareImage(${image.id})">
                                <i class="fas fa-balance-scale"></i> 对比
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.dom.galleryGrid.innerHTML = html || `
            <div class="no-images">
                <i class="fas fa-search"></i>
                <h3>未找到符合条件的图像</h3>
                <p>请尝试其他筛选条件</p>
            </div>
        `;
        
        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredImages.length / IMAGE_VIEWER_CONFIG.IMAGES_PER_PAGE);
        const paginationEl = document.getElementById('galleryPagination');
        
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }
        
        let html = `<div class="pagination">`;
        
        // 上一页按钮
        html += `<button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                         onclick="window.imageViewer.changePage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                 </button>`;
        
        // 页码
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - this.currentPage) <= 2) {
                html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                                 onclick="window.imageViewer.changePage(${i})">
                            ${i}
                         </button>`;
            } else if (Math.abs(i - this.currentPage) === 3) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        // 下一页按钮
        html += `<button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                         onclick="window.imageViewer.changePage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                 </button>`;
        
        html += `</div>`;
        
        paginationEl.innerHTML = html;
    }

    updateStats() {
        document.getElementById('totalImages').textContent = this.imagesData.images.length;
        document.getElementById('filteredImages').textContent = this.filteredImages.length;
        document.getElementById('selectedImages').textContent = this.selectedImages.size;
    }

    // 图像查看功能
    openImage(imageId) {
        const image = this.filteredImages.find(img => img.id === imageId);
        if (!image) return;
        
        this.currentSlideIndex = this.filteredImages.findIndex(img => img.id === imageId);
        this.currentZoom = 1;
        
        // 更新UI
        document.getElementById('imageTitle').textContent = `${image.crop} - ${image.disease}`;
        document.getElementById('infoCrop').textContent = image.crop;
        document.getElementById('infoDisease').textContent = image.disease;
        document.getElementById('infoType').textContent = image.type;
        document.getElementById('infoHealth').textContent = image.is_healthy ? '健康' : '患病';
        document.getElementById('infoHealth').className = `health-status ${image.is_healthy ? 'healthy' : 'diseased'}`;
        document.getElementById('infoId').textContent = image.id;
        
        // 更新图像计数
        this.updateImageCounter();
        
        // 显示加载状态
        document.getElementById('imageLoading').style.display = 'flex';
        this.dom.currentImage.style.opacity = '0';
        
        // 加载图像
        this.dom.currentImage.src = image.preview;
        this.dom.currentImage.alt = `${image.crop} - ${image.disease}`;
        
        // 图像加载完成
        this.dom.currentImage.onload = () => {
            document.getElementById('imageLoading').style.display = 'none';
            this.dom.currentImage.style.opacity = '1';
            this.setZoomLevel(this.currentZoom);
        };
        
        // 加载缩略图条
        this.renderThumbnailStrip();
        
        // 显示模态框
        this.dom.imageModal.style.display = 'flex';
        this.dom.viewerModal.style.display = 'none';
    }

    closeImageViewer() {
        this.dom.imageModal.style.display = 'none';
        this.stopSlideshow();
    }

    navigateImage(direction) {
        const newIndex = this.currentSlideIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.filteredImages.length) {
            this.currentSlideIndex = newIndex;
            const image = this.filteredImages[this.currentSlideIndex];
            this.openImage(image.id);
        }
    }

    updateImageCounter() {
        document.getElementById('imageCounter').textContent = 
            `${this.currentSlideIndex + 1} / ${this.filteredImages.length}`;
    }

    renderThumbnailStrip() {
        const stripEl = document.getElementById('thumbnailStrip');
        const startIndex = Math.max(0, this.currentSlideIndex - 3);
        const endIndex = Math.min(this.filteredImages.length, startIndex + 7);
        const displayImages = this.filteredImages.slice(startIndex, endIndex);
        
        const html = displayImages.map((img, index) => {
            const isActive = (startIndex + index) === this.currentSlideIndex;
            return `
                <div class="thumbnail-item ${isActive ? 'active' : ''}" 
                     onclick="window.imageViewer.openImage(${img.id})">
                    <img src="${img.thumbnail}" 
                         alt="${img.crop} - ${img.disease}"
                         loading="lazy">
                    <div class="thumbnail-overlay">${img.disease}</div>
                </div>
            `;
        }).join('');
        
        stripEl.innerHTML = html;
    }

    // 缩放功能
    zoomImage(delta) {
        this.currentZoom = Math.max(0.5, Math.min(5, this.currentZoom + delta));
        this.setZoomLevel(this.currentZoom);
    }

    setZoomLevel(zoom) {
        this.currentZoom = zoom;
        this.dom.currentImage.style.transform = `scale(${zoom})`;
        
        // 更新按钮状态
        document.querySelectorAll('.zoom-level-btn').forEach(btn => {
            const level = parseFloat(btn.dataset.zoom);
            btn.classList.toggle('active', Math.abs(level - zoom) < 0.1);
        });
    }

    // 全屏功能
    toggleFullscreen() {
        const container = document.getElementById('imageDisplayArea');
        
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
            this.dom.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            this.dom.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    // 幻灯片播放
    toggleSlideshow() {
        if (this.slideshowInterval) {
            this.stopSlideshow();
        } else {
            this.startSlideshow();
        }
    }

    startSlideshow() {
        const speed = parseInt(document.getElementById('slideshowSpeed').value) * 1000;
        
        this.slideshowInterval = setInterval(() => {
            if (this.currentSlideIndex < this.filteredImages.length - 1) {
                this.navigateImage(1);
            } else {
                this.currentSlideIndex = -1;
                this.navigateImage(1);
            }
        }, speed);
        
        this.dom.slideshowBtn.innerHTML = '<i class="fas fa-pause"></i> 停止播放';
    }

    stopSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
            this.dom.slideshowBtn.innerHTML = '<i class="fas fa-play"></i> 开始播放';
        }
    }

    // 选择功能
    toggleSelect(imageId) {
        if (this.selectedImages.has(imageId)) {
            this.selectedImages.delete(imageId);
        } else {
            this.selectedImages.add(imageId);
        }
        this.updateStats();
        this.renderGallery();
    }

    clearSelected() {
        this.selectedImages.clear();
        this.updateStats();
        this.renderGallery();
    }

    // 下载功能
    downloadCurrentImage() {
        const image = this.filteredImages[this.currentSlideIndex];
        const link = document.createElement('a');
        link.href = image.preview;
        link.download = `${image.crop}_${image.disease}_${image.id}.jpg`;
        link.click();
    }

    // 公共接口
    openGallery() {
        this.populateFilters();
        this.applyFilters();
        this.dom.viewerModal.style.display = 'flex';
    }

    closeGallery() {
        this.dom.viewerModal.style.display = 'none';
    }

    compareImage(imageId) {
        const image = this.filteredImages.find(img => img.id === imageId);
        if (!image) return;
        
        // 查找相似病害
        const similarImages = this.imagesData.images.filter(img => 
            img.crop === image.crop && 
            img.disease !== image.disease && 
            !img.is_healthy
        ).slice(0, 3);
        
        if (similarImages.length > 0) {
            alert(`找到了 ${similarImages.length} 张相似病害图像`);
            // 这里可以实现对比功能
        }
    }

    changePage(page) {
        if (page >= 1 && page <= Math.ceil(this.filteredImages.length / IMAGE_VIEWER_CONFIG.IMAGES_PER_PAGE)) {
            this.currentPage = page;
            this.renderGallery();
            
            // 滚动到顶部
            document.getElementById('galleryGrid').scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// 全局导出
window.ImageViewer = ImageViewer;
window.imageViewer = new ImageViewer();