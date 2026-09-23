/**
 * app.js - Main Application Logic for E-Book Flip Pages Web App
 * Tech: HTML5, Tailwind CSS, JavaScript (Pure JS) & StPageFlip Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. CONSTANTS & STATE CONFIGURATION
    // -------------------------------------------------------------
    const TOTAL_PAGES = 36;
    const PAGE_FILES = Array.from({ length: TOTAL_PAGES }, (_, i) => `2026-P9-44_${i + 1}.webp`);

    // Multimedia configuration for pages with embedded videos
    const VIDEO_PAGES = {
        7: {
            src: 'https://storage.googleapis.com/connext-47f56.firebasestorage.app/ebook-2026/P-07-vdo.mp4',
            title: 'วิดีโอ: รับผลประโยชน์รวมสูงสุด 800%* (หน้า 7)',
            subtitle: 'AIA Healthier, Longer, Better Lives - สิทธิประโยชน์ความคุ้มครองโรคร้ายแรง'
        },
        14: {
            src: 'https://storage.googleapis.com/connext-47f56.firebasestorage.app/ebook-2026/P14-vdo.mp4',
            title: 'วิดีโอ: ต้องขอบคุณตัวเองตอนนั้น ที่ทำประกันโรคร้ายแรง (หน้า 14)',
            subtitle: 'AIA Healthier, Longer, Better Lives - เรื่องจริงและกำลังใจจากผู้เอาประกัน'
        }
    };
    
    let pageFlip = null;
    let currentPage = 0; // 0-indexed for StPageFlip
    let isSoundMuted = false;
    let autoPlayInterval = null;
    let displayMode = 'auto'; // 'auto', 'single', 'double'
    
    // Zoom state
    let currentZoomScale = 1;
    let isDraggingZoom = false;
    let zoomStartX = 0, zoomStartY = 0;
    let zoomTranslateX = 0, zoomTranslateY = 0;

    // Web Audio API Context for Page Turn Sound
    let audioCtx = null;

    // -------------------------------------------------------------
    // 2. DOM ELEMENTS
    // -------------------------------------------------------------
    const bookStage = document.getElementById('book-stage');
    const bookContainer = document.getElementById('book-container');
    
    // Controls
    const btnFirst = document.getElementById('btn-first');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnLast = document.getElementById('btn-last');
    
    const pageInput = document.getElementById('page-input');
    const totalPagesLabel = document.getElementById('total-pages-label');
    const pageSlider = document.getElementById('page-slider');
    const pageDisplayBadge = document.getElementById('page-display-badge');
    const layoutModeBadge = document.getElementById('layout-mode-badge');
    
    // Buttons
    const btnThumbnails = document.getElementById('btn-thumbnails');
    const btnZoom = document.getElementById('btn-zoom');
    const btnPrint = document.getElementById('btn-print');
    const btnSound = document.getElementById('btn-sound');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnAutoPlay = document.getElementById('btn-autoplay');
    const btnModeToggle = document.getElementById('btn-mode-toggle');

    // Modals
    const thumbnailModal = document.getElementById('thumbnail-modal');
    const btnCloseThumbnails = document.getElementById('btn-close-thumbnails');
    const thumbnailGrid = document.getElementById('thumbnail-grid');

    const zoomModal = document.getElementById('zoom-modal');
    const btnCloseZoom = document.getElementById('btn-close-zoom');
    const zoomImg = document.getElementById('zoom-img');
    const zoomContainer = document.getElementById('zoom-container');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');

    const printModal = document.getElementById('print-modal');
    const btnClosePrint = document.getElementById('btn-close-print');
    const btnPrintCurrent = document.getElementById('btn-print-current');
    const btnPrintAll = document.getElementById('btn-print-all');
    const printSection = document.getElementById('print-section');

    const videoModal = document.getElementById('video-modal');
    const btnCloseVideo = document.getElementById('btn-close-video');
    const modalVideoPlayer = document.getElementById('modal-video-player');
    const modalVideoSource = document.getElementById('modal-video-source');
    const videoModalTitle = document.getElementById('video-modal-title');
    const videoModalSubtitle = document.getElementById('video-modal-subtitle');

    // -------------------------------------------------------------
    // 3. INITIALIZE BOOK & PAGES
    // -------------------------------------------------------------
    function createPageElements() {
        bookContainer.innerHTML = '';
        PAGE_FILES.forEach((file, index) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = `page ${index === 0 || index === TOTAL_PAGES - 1 ? 'hard-cover' : ''}`;
            const pageNum = index + 1;
            const videoConfig = VIDEO_PAGES[pageNum];

            let videoHtml = '';
            if (videoConfig) {
                videoHtml = `
                    <div class="page-video-wrapper absolute rounded-xl md:rounded-2xl overflow-hidden shadow-2xl transition group border-4 border-white"
                         style="left: 9.13%; top: 24.69%; width: 81.71%; height: 37.14%; z-index: 10;"
                         data-page="${pageNum}">
                        
                        <!-- Inline HTML5 Video Player -->
                        <video class="page-inline-video w-full h-full object-cover hidden rounded-xl md:rounded-2xl bg-black"
                               controls playsinline preload="metadata">
                            <source src="${videoConfig.src}" type="video/mp4" />
                        </video>

                        <!-- Overlay Poster & Play Button -->
                        <div class="page-video-overlay absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/5 hover:bg-black/25 transition duration-300">
                            <!-- Play Button with Pulsing Ring -->
                            <div class="relative flex items-center justify-center">
                                <div class="play-pulse-ring"></div>
                                <button class="btn-play-inline relative w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-xl shadow-rose-950/60 flex items-center justify-center transform group-hover:scale-110 active:scale-95 transition z-10" title="คลิกเล่นวิดีโอ">
                                    <i class="fa-solid fa-play text-base md:text-xl ml-1 text-white"></i>
                                </button>
                            </div>

                            <!-- Label -->
                            <div class="mt-2.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-700/70 text-slate-100 text-[10px] md:text-xs font-medium shadow flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition">
                                <i class="fa-solid fa-circle-play text-rose-400"></i>
                                <span>คลิกเพื่อเล่นวิดีโอ</span>
                            </div>

                            <!-- Cinema Mode Trigger Button -->
                            <button class="btn-open-cinema absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 text-[10px] md:text-xs shadow transition flex items-center space-x-1" title="เปิดดูแบบโรงภาพยนตร์เต็มจอ">
                                <i class="fa-solid fa-expand text-amber-400 text-[10px]"></i>
                                <span class="hidden sm:inline">โรงภาพยนตร์</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            pageDiv.innerHTML = `
                <div class="w-full h-full flex items-center justify-center bg-white relative">
                    <img src="${file}" alt="Page ${pageNum}" class="w-full h-full object-contain pointer-events-none select-none" loading="lazy" />
                    ${videoHtml}
                    <div class="absolute bottom-2 right-3 text-[10px] text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded shadow-sm opacity-10 hover:opacity-90 transition duration-200 pointer-events-auto">
                        หน้า ${pageNum}
                    </div>
                </div>
            `;
            bookContainer.appendChild(pageDiv);
        });

        setupVideoEventListeners();
    }

    function calculateBookSize() {
        const topHeight = document.getElementById('top-toolbar')?.offsetHeight || 64;
        const bottomHeight = document.getElementById('bottom-toolbar')?.offsetHeight || 64;
        
        // Exact available viewport stage dimensions with safety padding
        const maxAvailableHeight = Math.max(260, window.innerHeight - topHeight - bottomHeight - 36);
        const maxAvailableWidth = Math.max(280, window.innerWidth - 32);

        // Aspect ratio of a single page (2717 / 3508 = ~0.774515)
        const pageAspectRatio = 2717 / 3508;

        // Check if layout should be portrait (single page)
        const isPortrait = (displayMode === 'single') || 
                           (displayMode === 'auto' && (maxAvailableWidth / maxAvailableHeight < 1.18 || window.innerWidth < 768));

        let width, height;

        if (isPortrait) {
            // Single page: height <= maxAvailableHeight, width <= maxAvailableWidth
            const widthFromHeight = maxAvailableHeight * pageAspectRatio;
            if (widthFromHeight <= maxAvailableWidth) {
                height = maxAvailableHeight;
                width = widthFromHeight;
            } else {
                width = maxAvailableWidth;
                height = width / pageAspectRatio;
            }
        } else {
            // Two-page spread: total width = 2 * width, total height = height
            // Height-constrained check: if full height is used, does spread width fit?
            const spreadWidthFromHeight = maxAvailableHeight * (pageAspectRatio * 2);
            
            if (spreadWidthFromHeight <= maxAvailableWidth) {
                // Height-constrained (typical desktop/laptop widescreen):
                // Height fits exactly within stage height without any vertical overflow!
                height = maxAvailableHeight;
                width = height * pageAspectRatio;
            } else {
                // Width-constrained:
                const spreadWidth = maxAvailableWidth;
                width = spreadWidth / 2;
                height = width / pageAspectRatio;
            }
        }

        width = Math.floor(width);
        height = Math.floor(height);

        return {
            width: width,
            height: height,
            isPortrait: isPortrait
        };
    }

    function updateBookDimensions() {
        if (!pageFlip) return;
        const dims = calculateBookSize();
        
        // Update PageFlip internal settings
        if (pageFlip.setting) {
            pageFlip.setting.width = dims.width;
            pageFlip.setting.height = dims.height;
            pageFlip.setting.minWidth = dims.width;
            pageFlip.setting.minHeight = dims.height;
            pageFlip.setting.maxWidth = dims.width;
            pageFlip.setting.maxHeight = dims.height;
        }
        if (pageFlip.getRender() && pageFlip.getRender().setting) {
            pageFlip.getRender().setting.width = dims.width;
            pageFlip.getRender().setting.height = dims.height;
            pageFlip.getRender().setting.minWidth = dims.width;
            pageFlip.getRender().setting.minHeight = dims.height;
            pageFlip.getRender().setting.maxWidth = dims.width;
            pageFlip.getRender().setting.maxHeight = dims.height;
        }

        const totalWidth = dims.isPortrait ? dims.width : (dims.width * 2);
        bookContainer.style.width = totalWidth + 'px';
        bookContainer.style.height = dims.height + 'px';
        bookContainer.style.minWidth = '0px';
        bookContainer.style.minHeight = '0px';
        bookContainer.style.maxWidth = '100%';
        bookContainer.style.maxHeight = '100%';

        if (pageFlip.getRender()) {
            pageFlip.getRender().update();
        }
        pageFlip.updateFromHtml(document.querySelectorAll('.page'));
        updateCoverCentering();
    }

    function initPageFlip() {
        createPageElements();

        const dimensions = calculateBookSize();

        const totalWidth = dimensions.isPortrait ? dimensions.width : (dimensions.width * 2);
        bookContainer.style.width = totalWidth + 'px';
        bookContainer.style.height = dimensions.height + 'px';
        bookContainer.style.maxWidth = '100%';
        bookContainer.style.maxHeight = '100%';

        // Create StPageFlip Instance with 'fixed' size to guarantee it never exceeds dimensions
        pageFlip = new St.PageFlip(bookContainer, {
            width: dimensions.width,
            height: dimensions.height,
            size: 'fixed',
            minWidth: 150,
            maxWidth: 2500,
            minHeight: 200,
            maxHeight: 2500,
            autoSize: false,
            maxShadowOpacity: 0.6,
            showCover: true,
            mobileScrollSupport: false,
            usePortrait: true,
            startPage: currentPage,
            clickEventForward: true
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page'));
        bookContainer.style.minWidth = '0px';
        bookContainer.style.minHeight = '0px';

        // Bind Flip Events
        pageFlip.on('flip', (e) => {
            currentPage = e.data;
            pauseAllVideos();
            updateUIState();
            playPageFlipSound();
        });

        pageFlip.on('onChangeOrientation', () => {
            const dims = calculateBookSize();
            updateCoverCentering();
        });

        pageFlip.on('changeOrientation', () => {
            updateCoverCentering();
        });

        // Double click page to open zoom
        bookContainer.addEventListener('dblclick', () => {
            openZoomModal();
        });

        totalPagesLabel.textContent = `/ ${TOTAL_PAGES}`;
        pageSlider.max = TOTAL_PAGES;

        updateUIState();
    }

    function updateCoverCentering() {
        if (!pageFlip) return;
        const isPortrait = pageFlip.getOrientation() === 'portrait';

        bookContainer.classList.remove('is-cover-first', 'is-cover-last');

        if (!isPortrait) {
            if (currentPage === 0) {
                bookContainer.classList.add('is-cover-first');
            } else if (currentPage === TOTAL_PAGES - 1) {
                bookContainer.classList.add('is-cover-last');
            }
        }
    }

    // -------------------------------------------------------------
    // 4. UI STATE UPDATE
    // -------------------------------------------------------------
    function updateUIState() {
        const pageNum = currentPage + 1; // 1-indexed for display
        pageInput.value = pageNum;
        pageSlider.value = pageNum;

        const isDouble = pageFlip && pageFlip.getOrientation() === 'landscape' && currentPage > 0 && currentPage < TOTAL_PAGES - 1;
        
        let hasVideoInSpread = false;
        if (isDouble) {
            const leftPage = currentPage % 2 === 0 ? currentPage : currentPage;
            const rightPage = leftPage + 1;
            hasVideoInSpread = !!VIDEO_PAGES[leftPage] || !!VIDEO_PAGES[rightPage];
            const videoTag = hasVideoInSpread ? `<span class="ml-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-semibold inline-flex items-center"><i class="fa-solid fa-play text-[8px] mr-1"></i>วิดีโอ</span>` : '';
            pageDisplayBadge.innerHTML = `หน้า ${leftPage} - ${Math.min(rightPage, TOTAL_PAGES)} / ${TOTAL_PAGES} ${videoTag}`;
        } else {
            hasVideoInSpread = !!VIDEO_PAGES[pageNum];
            const videoTag = hasVideoInSpread ? `<span class="ml-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-semibold inline-flex items-center"><i class="fa-solid fa-play text-[8px] mr-1"></i>วิดีโอ</span>` : '';
            pageDisplayBadge.innerHTML = `หน้า ${pageNum} / ${TOTAL_PAGES} ${videoTag}`;
        }

        // Highlight active thumbnail card
        document.querySelectorAll('.thumb-card').forEach((card, idx) => {
            if (idx === currentPage) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        updateCoverCentering();
    }

    // -------------------------------------------------------------
    // 5. WEB AUDIO API PAGE TURN SOUND
    // -------------------------------------------------------------
    function playPageFlipSound() {
        if (isSoundMuted) return;

        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Synthesize paper rustle sound with bandpass filtered noise
            const bufferSize = audioCtx.sampleRate * 0.15; // 150ms sound
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }

            const whiteNoise = audioCtx.createBufferSource();
            whiteNoise.buffer = buffer;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 1.5;

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

            whiteNoise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            whiteNoise.start();
        } catch (e) {
            console.warn('Audio playback error:', e);
        }
    }

    // -------------------------------------------------------------
    // 6. THUMBNAIL DRAWER MODAL
    // -------------------------------------------------------------
    function buildThumbnails() {
        thumbnailGrid.innerHTML = '';
        PAGE_FILES.forEach((file, index) => {
            const pageNum = index + 1;
            const hasVideo = !!VIDEO_PAGES[pageNum];
            const card = document.createElement('div');
            card.className = `thumb-card flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200 cursor-pointer relative shadow-sm ${index === currentPage ? 'active' : ''}`;
            
            const videoBadge = hasVideo ? `
                <div class="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 shadow-sm z-10">
                    <i class="fa-solid fa-play text-[7px]"></i>
                    <span>วิดีโอ</span>
                </div>
            ` : '';

            card.innerHTML = `
                <div class="w-full aspect-[2717/3508] bg-slate-100 rounded overflow-hidden mb-2 relative border border-slate-200/60">
                    <img src="${file}" alt="Thumbnail ${pageNum}" class="w-full h-full object-cover" loading="lazy" />
                    ${videoBadge}
                </div>
                <span class="text-xs text-slate-700 font-medium">หน้า ${pageNum}</span>
            `;
            card.addEventListener('click', () => {
                pageFlip.flip(index);
                closeThumbnailsModal();
            });
            thumbnailGrid.appendChild(card);
        });
    }

    function openThumbnailsModal() {
        pauseAllVideos();
        buildThumbnails();
        thumbnailModal.classList.remove('hidden');
        thumbnailModal.classList.add('flex');
    }

    function closeThumbnailsModal() {
        thumbnailModal.classList.add('hidden');
        thumbnailModal.classList.remove('flex');
    }

    // -------------------------------------------------------------
    // 7. ZOOM & PAN LIGHTBOX MODAL
    // -------------------------------------------------------------
    function openZoomModal() {
        pauseAllVideos();
        const currentImgFile = PAGE_FILES[currentPage];
        zoomImg.src = currentImgFile;
        currentZoomScale = 1;
        zoomTranslateX = 0;
        zoomTranslateY = 0;
        applyZoomTransform();
        zoomModal.classList.remove('hidden');
        zoomModal.classList.add('flex');
    }

    function closeZoomModal() {
        zoomModal.classList.add('hidden');
        zoomModal.classList.remove('flex');
    }

    function applyZoomTransform() {
        zoomImg.style.transform = `translate(${zoomTranslateX}px, ${zoomTranslateY}px) scale(${currentZoomScale})`;
    }

    // Zoom mouse drag / pan logic
    zoomContainer.addEventListener('mousedown', (e) => {
        if (currentZoomScale > 1) {
            isDraggingZoom = true;
            zoomStartX = e.clientX - zoomTranslateX;
            zoomStartY = e.clientY - zoomTranslateY;
            zoomContainer.classList.add('zoom-draggable');
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingZoom) {
            zoomTranslateX = e.clientX - zoomStartX;
            zoomTranslateY = e.clientY - zoomStartY;
            applyZoomTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        isDraggingZoom = false;
    });

    zoomContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        currentZoomScale = Math.min(Math.max(1, currentZoomScale + delta), 3.5);
        if (currentZoomScale === 1) {
            zoomTranslateX = 0;
            zoomTranslateY = 0;
        }
        applyZoomTransform();
    });

    // -------------------------------------------------------------
    // 8. PRINT ENGINE
    // -------------------------------------------------------------
    function openPrintModal() {
        pauseAllVideos();
        printModal.classList.remove('hidden');
        printModal.classList.add('flex');
    }

    function closePrintModal() {
        printModal.classList.add('hidden');
        printModal.classList.remove('flex');
    }

    function triggerPrint(pagesToPrint) {
        printSection.innerHTML = '';
        pagesToPrint.forEach(file => {
            const pageItem = document.createElement('div');
            pageItem.className = 'print-page-item';
            pageItem.innerHTML = `<img src="${file}" alt="Print Page" />`;
            printSection.appendChild(pageItem);
        });

        closePrintModal();

        // Allow images to load into DOM before printing
        setTimeout(() => {
            window.print();
        }, 400);
    }

    // -------------------------------------------------------------
    // 9. MULTIMEDIA & VIDEO SYSTEM
    // -------------------------------------------------------------
    function setupVideoEventListeners() {
        document.querySelectorAll('.page-video-wrapper').forEach(wrapper => {
            const pageNum = parseInt(wrapper.dataset.page, 10);
            const inlineVideo = wrapper.querySelector('.page-inline-video');
            const overlay = wrapper.querySelector('.page-video-overlay');
            const btnPlay = wrapper.querySelector('.btn-play-inline');
            const btnCinema = wrapper.querySelector('.btn-open-cinema');

            // Stop event bubbling so page-flip engine doesn't capture clicks/touches on the video card
            ['mousedown', 'touchstart', 'pointerdown', 'click', 'dblclick'].forEach(evt => {
                wrapper.addEventListener(evt, (e) => {
                    e.stopPropagation();
                });
            });

            const startInlinePlayback = () => {
                pauseAllVideos();
                overlay.classList.add('hidden');
                inlineVideo.classList.remove('hidden');
                inlineVideo.play().catch(err => console.log('Autoplay prevented:', err));
            };

            if (btnPlay) {
                btnPlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startInlinePlayback();
                });
            }

            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-open-cinema')) return;
                    e.stopPropagation();
                    startInlinePlayback();
                });
            }

            if (btnCinema) {
                btnCinema.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openVideoModal(pageNum, inlineVideo ? inlineVideo.currentTime : 0);
                });
            }

            if (inlineVideo) {
                inlineVideo.addEventListener('ended', () => {
                    overlay.classList.remove('hidden');
                    inlineVideo.classList.add('hidden');
                });
            }
        });
    }

    function pauseAllVideos() {
        document.querySelectorAll('.page-inline-video').forEach(vid => {
            if (!vid.paused) {
                vid.pause();
            }
        });
        if (modalVideoPlayer && !modalVideoPlayer.paused) {
            modalVideoPlayer.pause();
        }
    }

    function openVideoModal(pageNum, startTime = 0) {
        pauseAllVideos();
        const config = VIDEO_PAGES[pageNum];
        if (!config) return;

        videoModalTitle.innerHTML = `<span>${config.title}</span> <span class="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60">HD 720p</span>`;
        videoModalSubtitle.textContent = config.subtitle;
        modalVideoSource.src = config.src;
        modalVideoPlayer.load();

        if (startTime > 0) {
            modalVideoPlayer.currentTime = startTime;
        }

        videoModal.classList.remove('hidden');
        videoModal.classList.add('flex');

        modalVideoPlayer.play().catch(err => console.log('Video play error:', err));
    }

    function closeVideoModal() {
        if (modalVideoPlayer) {
            modalVideoPlayer.pause();
        }
        videoModal.classList.add('hidden');
        videoModal.classList.remove('flex');
    }

    // -------------------------------------------------------------
    // 10. EVENT LISTENERS & SHORTCUTS
    // -------------------------------------------------------------
    btnFirst.addEventListener('click', () => pageFlip.flip(0));
    btnPrev.addEventListener('click', () => pageFlip.flipPrev());
    btnNext.addEventListener('click', () => pageFlip.flipNext());
    btnLast.addEventListener('click', () => pageFlip.flip(TOTAL_PAGES - 1));

    pageSlider.addEventListener('input', (e) => {
        const targetPage = parseInt(e.target.value, 10) - 1;
        pageFlip.flip(targetPage);
    });

    pageInput.addEventListener('change', (e) => {
        let targetPage = parseInt(e.target.value, 10);
        if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
        if (targetPage > TOTAL_PAGES) targetPage = TOTAL_PAGES;
        pageFlip.flip(targetPage - 1);
    });

    btnThumbnails.addEventListener('click', openThumbnailsModal);
    btnCloseThumbnails.addEventListener('click', closeThumbnailsModal);

    btnZoom.addEventListener('click', openZoomModal);
    btnCloseZoom.addEventListener('click', closeZoomModal);
    btnZoomIn.addEventListener('click', () => {
        currentZoomScale = Math.min(currentZoomScale + 0.25, 3.5);
        applyZoomTransform();
    });
    btnZoomOut.addEventListener('click', () => {
        currentZoomScale = Math.max(1, currentZoomScale - 0.25);
        if (currentZoomScale === 1) { zoomTranslateX = 0; zoomTranslateY = 0; }
        applyZoomTransform();
    });
    btnZoomReset.addEventListener('click', () => {
        currentZoomScale = 1;
        zoomTranslateX = 0;
        zoomTranslateY = 0;
        applyZoomTransform();
    });

    btnPrint.addEventListener('click', openPrintModal);
    btnClosePrint.addEventListener('click', closePrintModal);

    btnPrintCurrent.addEventListener('click', () => {
        const pages = [PAGE_FILES[currentPage]];
        // If in two page spread, also add adjacent page
        if (pageFlip && pageFlip.getOrientation() === 'landscape' && currentPage > 0 && currentPage < TOTAL_PAGES - 1) {
            const rightPage = currentPage % 2 === 0 ? currentPage + 1 : currentPage - 1;
            if (rightPage >= 0 && rightPage < TOTAL_PAGES && rightPage !== currentPage) {
                pages.push(PAGE_FILES[rightPage]);
                pages.sort();
            }
        }
        triggerPrint(pages);
    });

    btnPrintAll.addEventListener('click', () => {
        triggerPrint(PAGE_FILES);
    });

    btnSound.addEventListener('click', () => {
        isSoundMuted = !isSoundMuted;
        btnSound.classList.toggle('text-amber-600', !isSoundMuted);
        btnSound.classList.toggle('text-slate-400', isSoundMuted);
        btnSound.querySelector('span').textContent = isSoundMuted ? 'ปิดเสียง' : 'เปิดเสียง';
    });

    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    btnAutoPlay.addEventListener('click', () => {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            btnAutoPlay.classList.remove('bg-amber-100', 'text-amber-700', 'border-amber-400');
            btnAutoPlay.querySelector('span').textContent = 'เล่นอัตโนมัติ';
        } else {
            btnAutoPlay.classList.add('bg-amber-100', 'text-amber-700', 'border-amber-400');
            btnAutoPlay.querySelector('span').textContent = 'หยุดเล่น';
            autoPlayInterval = setInterval(() => {
                if (currentPage >= TOTAL_PAGES - 1) {
                    pageFlip.flip(0);
                } else {
                    pageFlip.flipNext();
                }
            }, 4000);
        }
    });

    btnModeToggle.addEventListener('click', () => {
        if (displayMode === 'auto') {
            displayMode = 'single';
        } else if (displayMode === 'single') {
            displayMode = 'double';
        } else {
            displayMode = 'auto';
        }
        
        btnModeToggle.querySelector('span').textContent = 
            displayMode === 'single' ? 'โหมด: หน้าเดียว' :
            displayMode === 'double' ? 'โหมด: หน้าคู่' : 'โหมด: อัตโนมัติ';

        // Re-calculate size & refresh
        updateBookDimensions();
    });

    // Video Modal Close Event Listeners
    if (btnCloseVideo) {
        btnCloseVideo.addEventListener('click', closeVideoModal);
    }
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            pageFlip.flipPrev();
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
            pageFlip.flipNext();
        } else if (e.key === 'Escape') {
            closeThumbnailsModal();
            closeZoomModal();
            closePrintModal();
            closeVideoModal();
        }
    });

    // Responsive Window Resize Handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateBookDimensions();
        }, 150);
    });

    document.addEventListener('fullscreenchange', () => {
        setTimeout(updateBookDimensions, 100);
    });

    // Initialize application
    initPageFlip();
});
