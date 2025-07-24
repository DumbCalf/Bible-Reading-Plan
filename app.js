// 300 Day Catholic Bible Reading Plan App
class BibleReadingApp {
    constructor() {
        this.currentDay = 1;
        this.completedDays = new Set();
        this.showText = {
            psalm: false,
            gospel: false,
            wisdom: false,
            oldTestament: false,
            newTestament: false
        };
        this.readingChecks = {}; // Will store per-day checkbox states
        this.startDate = new Date();
        this.currentBook = null;
        this.currentChapter = null;
        this.notifications = {
            enabled: false,
            times: {
                psalm: '06:00',
                gospel: '08:00', 
                wisdom: '12:00',
                oldTestament: '18:00',
                newTestament: '20:00'
            },
            categories: {
                psalm: true,
                gospel: true,
                wisdom: true,
                oldTestament: true,
                newTestament: true
            }
        };
        
        this.initializeApp();
        this.loadProgress();
        this.displayCurrentDay();
        this.initializeBibleNavigation();
        this.initializeFullPlanOverview();
        this.initializeStartDatePicker();
        this.initializeNotifications();
        this.setupEventListeners();
        this.setupPWAInstall();
    }

    initializeApp() {
        // Set default start date if not exists
        const savedStartDate = localStorage.getItem('bibleReadingStartDate');
        if (savedStartDate) {
            this.startDate = new Date(savedStartDate);
        } else {
            localStorage.setItem('bibleReadingStartDate', this.startDate.toISOString());
        }
        
        // Calculate current day based on start date
        this.calculateCurrentDay();
    }

    calculateCurrentDay() {
        // Check for URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlDay = urlParams.get('day');
        
        if (urlDay && !isNaN(urlDay)) {
            const dayNumber = parseInt(urlDay);
            if (dayNumber >= 1 && dayNumber <= 300) {
                this.currentDay = dayNumber;
                localStorage.setItem('currentReadingDay', this.currentDay.toString());
                return;
            }
        }
        
        const today = new Date();
        const diffTime = Math.abs(today - this.startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Allow for the 65 buffer days within a year
        const daysSinceStart = Math.min(diffDays + 1, 365);
        
        // Find the appropriate reading day (max 300)
        const savedCurrentDay = localStorage.getItem('currentReadingDay');
        if (savedCurrentDay) {
            this.currentDay = Math.min(parseInt(savedCurrentDay), 300);
        } else {
            this.currentDay = Math.min(daysSinceStart, 300);
        }
    }

    loadProgress() {
        const saved = localStorage.getItem('completedDays');
        if (saved) {
            this.completedDays = new Set(JSON.parse(saved));
        }
        
        const savedTextPreference = localStorage.getItem('showBibleText');
        if (savedTextPreference) {
            const parsed = JSON.parse(savedTextPreference);
            // Handle both old boolean format and new object format
            if (typeof parsed === 'boolean') {
                // Old format - set all sections to the same value
                this.showText = {
                    psalm: parsed,
                    gospel: parsed,
                    wisdom: parsed,
                    oldTestament: parsed,
                    newTestament: parsed
                };
            } else {
                // New object format
                this.showText = { ...this.showText, ...parsed };
            }
        }
        
        // Load reading checkbox states
        const savedCheckStates = localStorage.getItem('readingChecks');
        if (savedCheckStates) {
            this.readingChecks = JSON.parse(savedCheckStates);
        }
        
        // Load notification settings
        const savedNotifications = localStorage.getItem('notificationSettings');
        if (savedNotifications) {
            this.notifications = { ...this.notifications, ...JSON.parse(savedNotifications) };
        }
    }

    saveProgress() {
        localStorage.setItem('completedDays', JSON.stringify([...this.completedDays]));
        localStorage.setItem('currentReadingDay', this.currentDay.toString());
        localStorage.setItem('showBibleText', JSON.stringify(this.showText));
        localStorage.setItem('readingChecks', JSON.stringify(this.readingChecks));
        localStorage.setItem('notificationSettings', JSON.stringify(this.notifications));
    }

    displayCurrentDay() {
        const reading = readingPlan[this.currentDay - 1];
        if (!reading) return;

        // Debug logging for Day 276
        if (this.currentDay === 276) {
            console.log('DEBUG: Day 276 data:', reading);
            console.log('DEBUG: oldTestament reference:', reading.oldTestament);
        }

        // Update day information
        document.getElementById('currentDay').textContent = `Day ${this.currentDay}`;
        document.getElementById('dayTitle').textContent = `Day ${reading.day} Readings`;
        
        // Update reading references
        document.getElementById('psalmRef').textContent = `Psalm ${reading.psalm}`;
        document.getElementById('gospelRef').textContent = reading.gospel;
        document.getElementById('wisdomRef').textContent = reading.wisdom;
        
        // Special display text for Esther days with additions
        if (reading.day === 276 && reading.oldTestament.includes('Esther 11:2-12')) {
            document.getElementById('oldTestamentRef').textContent = 'Esther 1-3';
        } else if (reading.day === 277 && reading.oldTestament.includes('Esther 4-4:17')) {
            document.getElementById('oldTestamentRef').textContent = 'Esther 4-5';
        } else if (reading.day === 278 && reading.oldTestament.includes('Esther 6-8:12')) {
            document.getElementById('oldTestamentRef').textContent = 'Esther 6-8';
        } else if (reading.day === 279 && reading.oldTestament.includes('Esther 9-10:3')) {
            document.getElementById('oldTestamentRef').textContent = 'Esther 9-10';
        } else {
            document.getElementById('oldTestamentRef').textContent = reading.oldTestament;
        }
        
        document.getElementById('newTestamentRef').textContent = reading.newTestament;
        
        // Update progress
        this.updateProgress();
        
        // Update navigation buttons
        this.updateNavigation();
        
        // Update mark complete button
        this.updateMarkCompleteButton();
        
        // Load Bible text for enabled sections
        this.updateTextDisplays(reading);
        
        // Update toggle button states
        this.updateToggleButtons();
        
        // Update checkbox states
        this.updateCheckboxes();
    }

    updateProgress() {
        const completedCount = this.completedDays.size;
        const remainingDays = 300 - completedCount;
        // Only show 100% when all 300 days are actually completed
        const percentage = completedCount === 300 ? 100 : Math.floor((completedCount / 300) * 100);
        
        // Update progress bar
        document.getElementById('progressFill').style.width = `${percentage}%`;
        
        // Update progress stats
        document.getElementById('completedDays').textContent = completedCount;
        document.getElementById('remainingDays').textContent = remainingDays;
        
        // Update quick stats  
        document.getElementById('percentComplete').textContent = `${percentage}%`;
        
        // Calculate streak
        const streak = this.calculateStreak();
        document.getElementById('streakDays').textContent = streak;
        
        // Calculate days ahead/behind schedule
        const today = new Date();
        const daysSinceStart = Math.floor((today - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
        const daysAhead = Math.max(0, completedCount - daysSinceStart);
        document.getElementById('daysAhead').textContent = daysAhead;
        
        // Update buffer days remaining  
        // You start with 65 buffer days. Use them when you fall behind the daily pace.
        // Give a grace period: don't count Day 1 as missed until Day 2
        const expectedCompleted = Math.max(0, daysSinceStart - 1);
        const bufferDaysUsed = Math.max(0, expectedCompleted - completedCount);
        const bufferDaysRemaining = Math.max(0, 65 - bufferDaysUsed);
        document.getElementById('bufferDays').textContent = bufferDaysRemaining;
        
        // Calculate days missed (same as buffer days used)  
        const daysMissed = Math.max(0, expectedCompleted - completedCount);
        const daysMissedElement = document.getElementById('daysMissed');
        daysMissedElement.textContent = daysMissed;
        
        // Apply CSS class based on whether days are missed
        if (daysMissed === 0) {
            daysMissedElement.classList.add('zero-missed');
        } else {
            daysMissedElement.classList.remove('zero-missed');
        }
        
        // Update completion date
        this.updateCompletionDate(completedCount, daysMissed);
    }

    calculateStreak() {
        if (this.completedDays.size === 0) return 0;
        
        // Find the highest completed day
        const completedArray = Array.from(this.completedDays).sort((a, b) => b - a);
        const highestCompletedDay = completedArray[0];
        
        // Calculate streak from the highest completed day backwards
        let streak = 0;
        for (let day = highestCompletedDay; day >= 1; day--) {
            if (this.completedDays.has(day)) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevDay');
        const nextBtn = document.getElementById('nextDay');
        
        prevBtn.disabled = this.currentDay <= 1;
        nextBtn.disabled = this.currentDay >= 300;
    }

    updateMarkCompleteButton() {
        const btn = document.getElementById('markCompleteBtn');
        const isCompleted = this.completedDays.has(this.currentDay);
        
        if (isCompleted) {
            btn.textContent = 'Completed ✓';
            btn.className = 'btn completed';
        } else {
            btn.textContent = 'Mark Complete';
            btn.className = 'btn btn-primary';
        }
        
        this.updateMarkCompleteButtonState();
    }

    updateMarkCompleteButtonState() {
        const btn = document.getElementById('markCompleteBtn');
        const dayChecks = this.readingChecks[this.currentDay];
        
        if (!dayChecks) {
            return; // No checks for this day yet
        }
        
        const allSectionsRead = dayChecks.psalm && dayChecks.gospel && dayChecks.wisdom && 
                               dayChecks.oldTestament && dayChecks.newTestament;
        
        if (allSectionsRead && !this.completedDays.has(this.currentDay)) {
            btn.textContent = 'Mark Complete (All Read ✓)';
            btn.classList.add('ready-to-complete');
        } else if (!this.completedDays.has(this.currentDay)) {
            btn.textContent = 'Mark Complete';
            btn.classList.remove('ready-to-complete');
        }
    }

    async loadBibleText(reading) {
        try {
            // Ensure Bible data is loaded consistently
            await this.ensureBibleDataLoaded();
            
            // Load text for each reading section
            const readings = [
                { elementId: 'psalmText', bookName: 'Psalms', reference: reading.psalm },
                { elementId: 'gospelText', bookName: this.extractBookFromReference(reading.gospel), reference: reading.gospel },
                { elementId: 'wisdomText', bookName: this.extractBookFromReference(reading.wisdom), reference: reading.wisdom },
                { elementId: 'oldTestamentText', bookName: this.extractBookFromReference(reading.oldTestament), reference: reading.oldTestament },
                { elementId: 'newTestamentText', bookName: this.extractBookFromReference(reading.newTestament), reference: reading.newTestament }
            ];
            
            readings.forEach(({ elementId, bookName, reference }) => {
                const element = document.getElementById(elementId);
                const text = this.getBiblePassage(bookName, reference);
                
                if (text) {
                    element.innerHTML = text;
                    element.classList.add('show');
                } else {
                    element.innerHTML = `<p><em>Could not load: ${reference}</em></p>`;
                    element.classList.add('show');
                }
            });
            
        } catch (error) {
            console.error('Error loading Bible text:', error);
            
            // Show error message
            const textElements = ['psalmText', 'gospelText', 'wisdomText', 'oldTestamentText', 'newTestamentText'];
            textElements.forEach(elementId => {
                const element = document.getElementById(elementId);
                element.innerHTML = `<p><em>Error loading Bible text. Please try again.</em></p>`;
                element.classList.add('show');
            });
        }
    }
    
    extractBookFromReference(reference) {
        // Extract book name from references like "John 1", "Genesis 1-3", "1 Corinthians 5"
        // Also handle complex references like "Esther 11:2-12, 12:1-6; Esther 1-3:13"
        
        // Handle semicolon-separated references - take the first book name
        if (reference.includes(';')) {
            const firstPart = reference.split(';')[0].trim();
            const match = firstPart.match(/^(.+?)\s+\d/);
            return match ? match[1].trim() : firstPart;
        }
        
        // Standard extraction
        const match = reference.match(/^(.+?)\s+\d/);
        return match ? match[1].trim() : reference;
    }
    
    getBiblePassage(bookName, reference) {
        if (!this.bibleData) {
            console.log('Bible data not loaded');
            return null;
        }
        
        // Debug logging for Esther Day 276
        if (reference.includes('Esther 11:2-12')) {
            console.log('DEBUG: getBiblePassage called with:', bookName, reference);
        }
        
        // Handle complex references with semicolons (e.g., "Esther 11:2-12, 12:1-6; Esther 1:1-3:13")
        if (reference.includes(';')) {
            let html = '';
            const parts = reference.split(';').map(part => part.trim());
            
            console.log('DEBUG: Semicolon parts:', parts);
            
            parts.forEach((part, index) => {
                if (index > 0) {
                    html += '<div style="margin-top: 20px;"></div>'; // Add spacing between sections
                }
                const partHtml = this.getBiblePassage(bookName, part);
                if (partHtml) {
                    html += partHtml;
                }
            });
            
            return html;
        }
        
        // Extract book name and chapter:verse references
        // Handle cases where bookName is passed separately from reference
        let actualBookName, chapterVerseRef;
        
        if (reference.startsWith(bookName + ' ')) {
            // Reference includes book name (e.g., "Esther 1-3:13")
            actualBookName = bookName;
            chapterVerseRef = reference.substring(bookName.length + 1).trim();
        } else {
            // Reference doesn't include book name (e.g., just "1-3:13")
            const bookMatch = reference.match(/^(.+?)\s+(.+)$/);
            if (bookMatch) {
                actualBookName = bookMatch[1].trim();
                chapterVerseRef = bookMatch[2].trim();
            } else {
                actualBookName = bookName;
                chapterVerseRef = reference;
            }
        }
        
        if (!this.bibleData[actualBookName]) {
            console.log(`Book not found: ${actualBookName}`);
            return null;
        }
        
        const book = this.bibleData[actualBookName];
        let html = '';
        
        // Handle multiple chapter:verse ranges separated by commas
        const ranges = chapterVerseRef.split(',').map(range => range.trim());
        
        // Debug logging for Esther ranges
        if (actualBookName === 'Esther' && chapterVerseRef.includes('1-3:13')) {
            console.log('DEBUG: Esther ranges for 1-3:13:', ranges);
        }
        
        ranges.forEach((range, index) => {
            if (index > 0) {
                html += '<div style="margin-top: 15px;"></div>'; // Add spacing between ranges
            }
            
            // Parse chapter:verse range (e.g., "11:2-12", "1:1-3:13", "13:1-7")  
            const rangeMatch = range.match(/^(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/);
            
            if (!rangeMatch) {
                // Fallback patterns for different reference formats
                const simpleMatch = range.match(/^(\d+)(?:-(\d+))?$/); // "1-3"
                const singleVerseMatch = range.match(/^(\d+):(\d+)(?:-(\d+))?$/); // "3:13"
                const chapterRangeToVerseMatch = range.match(/^(\d+)-(\d+):(\d+)$/); // "1-3:13"
                
                // Debug logging for fallback parsing
                if (actualBookName === 'Esther' && range.includes('1-3:13')) {
                    console.log('DEBUG: Fallback parsing for range:', range);
                    console.log('DEBUG: simpleMatch:', simpleMatch);
                    console.log('DEBUG: singleVerseMatch:', singleVerseMatch);
                    console.log('DEBUG: chapterRangeToVerseMatch:', chapterRangeToVerseMatch);
                }
                
                if (chapterRangeToVerseMatch) {
                    // Handle pattern like "1-3:13" (chapters 1-3, ending at verse 13 of chapter 3)
                    const startChapter = parseInt(chapterRangeToVerseMatch[1]);
                    const endChapter = parseInt(chapterRangeToVerseMatch[2]);
                    const endVerse = parseInt(chapterRangeToVerseMatch[3]);
                    
                    console.log(`DEBUG: Processing chapters ${startChapter} to ${endChapter}, ending at verse ${endVerse}`);
                    
                    for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
                        if (chapterNum === endChapter) {
                            // Last chapter - only up to specified verse (starting from verse 1)
                            html += this.getChapterHtml(actualBookName, book, chapterNum, 1, endVerse);
                        } else {
                            // Full chapter
                            html += this.getChapterHtml(actualBookName, book, chapterNum, null, null);
                        }
                    }
                } else if (simpleMatch) {
                    const startChapter = parseInt(simpleMatch[1]);
                    const endChapter = simpleMatch[2] ? parseInt(simpleMatch[2]) : startChapter;
                    
                    console.log(`DEBUG: Processing chapters ${startChapter} to ${endChapter}`);
                    
                    for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
                        html += this.getChapterHtml(actualBookName, book, chapterNum, null, null);
                    }
                } else if (singleVerseMatch) {
                    const chapterNum = parseInt(singleVerseMatch[1]);
                    const startVerse = parseInt(singleVerseMatch[2]);
                    const endVerse = singleVerseMatch[3] ? parseInt(singleVerseMatch[3]) : startVerse;
                    html += this.getChapterHtml(actualBookName, book, chapterNum, startVerse, endVerse);
                }
                return;
            }
            
            const startChapter = parseInt(rangeMatch[1]);
            const startVerse = parseInt(rangeMatch[2]);
            const endChapter = rangeMatch[3] ? parseInt(rangeMatch[3]) : startChapter;
            const endVerse = parseInt(rangeMatch[4] || rangeMatch[2]);
            
            if (startChapter === endChapter) {
                // Same chapter
                html += this.getChapterHtml(actualBookName, book, startChapter, startVerse, endVerse);
            } else {
                // Multiple chapters
                for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
                    let fromVerse = null, toVerse = null;
                    
                    if (chapterNum === startChapter) {
                        fromVerse = startVerse;
                    } else if (chapterNum === endChapter) {
                        toVerse = endVerse;
                    }
                    
                    html += this.getChapterHtml(actualBookName, book, chapterNum, fromVerse, toVerse);
                }
            }
        });
        
        return html || `<p><em>No text found for ${reference}</em></p>`;
    }
    
    getChapterHtml(bookName, book, chapterNum, startVerse = null, endVerse = null) {
        const chapter = book[chapterNum];
        if (!chapter) {
            console.log(`Chapter ${chapterNum} not found in ${bookName}`);
            return '';
        }
        
        // Debug logging for Esther 11
        if (bookName === 'Esther' && chapterNum === 11) {
            console.log('DEBUG: getChapterHtml for Esther 11');
            console.log('DEBUG: startVerse:', startVerse, 'endVerse:', endVerse);
            console.log('DEBUG: Available verses in chapter 11:', Object.keys(chapter).sort((a, b) => parseInt(a) - parseInt(b)));
        }
        
        let html = '';
        const verses = Object.keys(chapter).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Filter verses if range is specified
        const filteredVerses = verses.filter(verseNum => {
            const num = parseInt(verseNum);
            return (!startVerse || num >= startVerse) && (!endVerse || num <= endVerse);
        });
        
        // Debug logging for filtered verses
        if (bookName === 'Esther' && chapterNum === 11) {
            console.log('DEBUG: Filtered verses:', filteredVerses);
        }
        
        if (filteredVerses.length === 0) return '';
        
        // Add chapter heading with proper formatting
        const isEstherAddition = bookName === 'Esther' && (chapterNum >= 11 && chapterNum <= 16 || (chapterNum === 10 && startVerse && startVerse >= 4));
        const isDanielAddition = bookName === 'Daniel' && (chapterNum === 13 || chapterNum === 14); // Susanna (13) and Bel & Dragon (14)
        
        // Debug logging
        if (bookName === 'Esther' && chapterNum >= 1 && chapterNum <= 5) {
            console.log(`DEBUG: Chapter ${chapterNum}, isEstherAddition: ${isEstherAddition}`);
        }
        if (bookName === 'Daniel' && chapterNum >= 1 && chapterNum <= 5) {
            console.log(`DEBUG: Daniel Chapter ${chapterNum}, isDanielAddition: ${isDanielAddition}`);
        }
        
        if (startVerse || endVerse) {
            const verseRange = startVerse && endVerse && startVerse !== endVerse 
                ? `${startVerse}-${endVerse}` 
                : (startVerse || endVerse);
            
            // Use singular "Psalm" for individual chapters
            const displayBookName = bookName === 'Psalms' ? 'Psalm' : bookName;
            
            if (isEstherAddition || isDanielAddition) {
                html += `<div data-chapter-type="addition" style="font-style: italic !important; font-weight: bold !important; font-size: 1.2em; margin: 1em 0 0.5em 0; color: var(--primary-blue);">${displayBookName} ${chapterNum}:${verseRange}</div>`;
            } else {
                html += `<div data-chapter-type="canonical" style="font-style: normal !important; font-weight: bold !important; font-size: 1.2em; margin: 1em 0 0.5em 0; color: var(--primary-blue);">${displayBookName} ${chapterNum}:${verseRange}</div>`;
            }
        } else {
            // Always show chapter heading for full chapters to provide clear structure
            // Use singular "Psalm" for individual chapters
            const displayBookName = bookName === 'Psalms' ? 'Psalm' : bookName;
            
            if (isEstherAddition || isDanielAddition) {
                html += `<div data-chapter-type="addition" style="font-style: italic !important; font-weight: bold !important; font-size: 1.2em; margin: 1em 0 0.5em 0; color: var(--primary-blue);">${displayBookName} ${chapterNum}</div>`;
            } else {
                html += `<div data-chapter-type="canonical" style="font-style: normal !important; font-weight: bold !important; font-size: 1.2em; margin: 1em 0 0.5em 0; color: var(--primary-blue);">${displayBookName} ${chapterNum}</div>`;
            }
        }
        
        // Special handling for Daniel 3: insert Song of Three Young Men between verses 23 and 24
        if (bookName === 'Daniel' && chapterNum === 3) {
            console.log('DEBUG: Taking special Daniel 3 path');
            const songChapter = book['3-song'];
            
            filteredVerses.forEach(verseNum => {
                let verseText = chapter[verseNum];
                
                console.log(`DEBUG: Processing Daniel 3:${verseNum}, original text:`, verseText.substring(0, 100));
                
                // For Daniel 3 narrative verses (1-30), ensure no italics
                verseText = verseText.replace(/<em>/gi, '').replace(/<\/em>/gi, '');
                verseText = verseText.replace(/<i>/gi, '').replace(/<\/i>/gi, '');
                
                console.log(`DEBUG: After cleaning, verse ${verseNum}:`, verseText.substring(0, 100));
                
                // Add explicit no-italic styling for Daniel 3 narrative verses
                html += `<p style="font-style: normal !important;"><span class="verse-number">${verseNum}</span> ${verseText}</p>`;
                
                // After verse 23, insert the Song of Three Young Men
                if (verseNum === '23' && songChapter) {
                    html += `<div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff;">`;
                    html += `<h4 style="margin: 0 0 10px 0; color: #666; font-style: italic;">Song of the Three Young Men</h4>`;
                    html += `<p style="margin: 0 0 10px 0; font-size: 0.9em; color: #666;"><em>The following verses (1-68) appear between Daniel 3:23 and 3:24 in Catholic Bibles</em></p>`;
                    
                    const songVerses = Object.keys(songChapter).sort((a, b) => parseInt(a) - parseInt(b));
                    songVerses.forEach(songVerseNum => {
                        const songVerseText = songChapter[songVerseNum];
                        html += `<p><span class="verse-number">${songVerseNum}</span> ${songVerseText}</p>`;
                    });
                    
                    html += `</div>`;
                }
            });
        } else {
            // Standard verse handling
            console.log(`DEBUG: Taking standard verse handling path for ${bookName} ${chapterNum}`);
            filteredVerses.forEach(verseNum => {
                let verseText = chapter[verseNum];
                const isEstherAddition = bookName === 'Esther' && (chapterNum >= 11 && chapterNum <= 16 || (chapterNum === 10 && parseInt(verseNum) >= 4));
                const isDanielAddition = bookName === 'Daniel' && (chapterNum === 13 || chapterNum === 14); // Susanna (13) and Bel & Dragon (14)
                
                // Apply italic formatting to deuterocanonical additions
                if (isEstherAddition || isDanielAddition) {
                    // Ensure the verse is wrapped in <em> tags for italics
                    if (!verseText.includes('<em>')) {
                        verseText = `<em>${verseText}</em>`;
                    }
                    html += `<p style="font-style: italic;"><span class="verse-number">${verseNum}</span> ${verseText}</p>`;
                } else {
                    // Regular canonical text - ensure no italics
                    verseText = verseText.replace(/<em>/gi, '').replace(/<\/em>/gi, '');
                    verseText = verseText.replace(/<i>/gi, '').replace(/<\/i>/gi, '');
                    html += `<p style="font-style: normal;"><span class="verse-number">${verseNum}</span> ${verseText}</p>`;
                }
            });
        }
        
        return html;
    }

    updateTextDisplays(reading) {
        const sections = [
            { key: 'psalm', elementId: 'psalmText', bookName: 'Psalms', reference: reading.psalm },
            { key: 'gospel', elementId: 'gospelText', bookName: this.extractBookFromReference(reading.gospel), reference: reading.gospel },
            { key: 'wisdom', elementId: 'wisdomText', bookName: this.extractBookFromReference(reading.wisdom), reference: reading.wisdom },
            { key: 'oldTestament', elementId: 'oldTestamentText', bookName: this.extractBookFromReference(reading.oldTestament), reference: reading.oldTestament },
            { key: 'newTestament', elementId: 'newTestamentText', bookName: this.extractBookFromReference(reading.newTestament), reference: reading.newTestament }
        ];

        sections.forEach(section => {
            const element = document.getElementById(section.elementId);
            if (this.showText[section.key]) {
                this.loadSingleBibleText(element, section.bookName, section.reference);
                element.classList.add('show');
            } else {
                element.classList.remove('show');
            }
        });
    }

    updateToggleButtons() {
        const buttons = [
            { key: 'psalm', buttonId: 'togglePsalmBtn' },
            { key: 'gospel', buttonId: 'toggleGospelBtn' },
            { key: 'wisdom', buttonId: 'toggleWisdomBtn' },
            { key: 'oldTestament', buttonId: 'toggleOldTestamentBtn' },
            { key: 'newTestament', buttonId: 'toggleNewTestamentBtn' }
        ];

        buttons.forEach(({ key, buttonId }) => {
            const button = document.getElementById(buttonId);
            if (this.showText[key]) {
                button.textContent = 'Hide';
                button.classList.add('active');
            } else {
                button.textContent = 'Show';
                button.classList.remove('active');
            }
        });
    }

    updateCheckboxes() {
        const checkboxes = [
            { key: 'psalm', checkboxId: 'psalmCheck' },
            { key: 'gospel', checkboxId: 'gospelCheck' },
            { key: 'wisdom', checkboxId: 'wisdomCheck' },
            { key: 'oldTestament', checkboxId: 'oldTestamentCheck' },
            { key: 'newTestament', checkboxId: 'newTestamentCheck' }
        ];

        // Get or initialize the checkbox states for this day
        if (!this.readingChecks[this.currentDay]) {
            this.readingChecks[this.currentDay] = {
                psalm: false,
                gospel: false,
                wisdom: false,
                oldTestament: false,
                newTestament: false
            };
        }

        const dayChecks = this.readingChecks[this.currentDay];
        checkboxes.forEach(({ key, checkboxId }) => {
            const checkbox = document.getElementById(checkboxId);
            checkbox.checked = dayChecks[key] || false;
        });
    }

    async loadSingleBibleText(element, bookName, reference) {
        try {
            // Ensure Bible data is loaded consistently
            await this.ensureBibleDataLoaded();
            
            const text = this.getBiblePassage(bookName, reference);
            if (text) {
                element.innerHTML = text;
            } else {
                element.innerHTML = `<p><em>Could not load: ${reference}</em></p>`;
            }
            
        } catch (error) {
            console.error('Error loading Bible text:', error);
            element.innerHTML = `<p><em>Error loading Bible text. Please try again.</em></p>`;
        }
    }

    hideBibleText() {
        const textElements = [
            'psalmText',
            'gospelText',
            'wisdomText', 
            'oldTestamentText',
            'newTestamentText'
        ];
        
        textElements.forEach(elementId => {
            document.getElementById(elementId).classList.remove('show');
        });
    }

    async initializeNotifications() {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
            console.log('This browser does not support service workers');
            return;
        }

        // Load existing notification settings
        this.loadNotificationSettings();
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.notifications.enabled = true;
                this.saveProgress();
                this.scheduleAllNotifications();
                return true;
            } else {
                this.notifications.enabled = false;
                this.saveProgress();
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    scheduleAllNotifications() {
        if (!this.notifications.enabled || Notification.permission !== 'granted') {
            return;
        }

        // Clear existing notifications
        this.clearAllNotifications();

        // Schedule notifications for each enabled category
        Object.keys(this.notifications.categories).forEach(category => {
            if (this.notifications.categories[category]) {
                this.scheduleNotification(category, this.notifications.times[category]);
            }
        });
    }

    scheduleNotification(category, time) {
        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime.getTime() - now.getTime();

        // Store timeout ID for clearing later
        const timeoutId = setTimeout(() => {
            this.showNotification(category);
            // Schedule next day's notification
            this.scheduleNotification(category, time);
        }, delay);

        // Store timeout ID for clearing
        if (!this.notificationTimeouts) {
            this.notificationTimeouts = {};
        }
        this.notificationTimeouts[category] = timeoutId;
    }

    showNotification(category) {
        if (Notification.permission !== 'granted' || !this.notifications.enabled) {
            return;
        }

        const reading = readingPlan[this.currentDay - 1];
        if (!reading) return;

        const categoryNames = {
            psalm: 'Psalm',
            gospel: 'Gospel', 
            wisdom: 'Wisdom',
            oldTestament: 'Old Testament',
            newTestament: 'New Testament'
        };

        const reference = reading[category];
        if (!reference) return;

        const notification = new Notification(`Time for ${categoryNames[category]} Reading`, {
            body: `Day ${this.currentDay}: ${reference}`,
            icon: '/Bible-Reading-Plan/icon-192x192.png',
            badge: '/Bible-Reading-Plan/icon-192x192.png',
            tag: `bible-reading-${category}`,
            requireInteraction: false,
            silent: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            // Navigate to reading plan if not already there
            if (window.location.pathname !== '/Bible-Reading-Plan/' && window.location.pathname !== '/Bible-Reading-Plan/index.html') {
                window.location.href = '/Bible-Reading-Plan/';
            }
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);
    }

    clearAllNotifications() {
        if (this.notificationTimeouts) {
            Object.values(this.notificationTimeouts).forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            this.notificationTimeouts = {};
        }
    }

    loadNotificationSettings() {
        // Already loaded in loadProgress() method
    }

    updateNotificationTime(category, time) {
        this.notifications.times[category] = time;
        this.saveProgress();
        if (this.notifications.enabled && this.notifications.categories[category]) {
            this.scheduleAllNotifications(); // Reschedule all
        }
    }

    toggleNotificationCategory(category, enabled) {
        this.notifications.categories[category] = enabled;
        this.saveProgress();
        if (this.notifications.enabled) {
            this.scheduleAllNotifications(); // Reschedule all
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('prevDay').addEventListener('click', () => {
            if (this.currentDay > 1) {
                this.currentDay--;
                this.displayCurrentDay();
                this.saveProgress();
            }
        });

        document.getElementById('nextDay').addEventListener('click', () => {
            if (this.currentDay < 300) {
                this.currentDay++;
                this.displayCurrentDay();
                this.saveProgress();
            }
        });

        // Mark complete
        document.getElementById('markCompleteBtn').addEventListener('click', () => {
            if (this.completedDays.has(this.currentDay)) {
                this.completedDays.delete(this.currentDay);
            } else {
                // Mark current day and all previous days as complete
                for (let day = 1; day <= this.currentDay; day++) {
                    this.completedDays.add(day);
                }
                
                // Auto-advance to next day if not completed
                if (this.currentDay < 300 && !this.completedDays.has(this.currentDay + 1)) {
                    setTimeout(() => {
                        this.currentDay++;
                        this.displayCurrentDay();
                        this.saveProgress();
                    }, 1000);
                }
            }
            
            this.updateMarkCompleteButton();
            this.updateProgress();
            this.saveProgress();
        });

        // Individual toggle buttons
        const toggleButtons = [
            { buttonId: 'togglePsalmBtn', sectionKey: 'psalm' },
            { buttonId: 'toggleGospelBtn', sectionKey: 'gospel' },
            { buttonId: 'toggleWisdomBtn', sectionKey: 'wisdom' },
            { buttonId: 'toggleOldTestamentBtn', sectionKey: 'oldTestament' },
            { buttonId: 'toggleNewTestamentBtn', sectionKey: 'newTestament' }
        ];

        toggleButtons.forEach(({ buttonId, sectionKey }) => {
            document.getElementById(buttonId).addEventListener('click', () => {
                this.showText[sectionKey] = !this.showText[sectionKey];
                const reading = readingPlan[this.currentDay - 1];
                this.updateTextDisplays(reading);
                this.updateToggleButtons();
                this.saveProgress();
            });
        });

        // Reading completion checkboxes
        const checkboxes = [
            { checkboxId: 'psalmCheck', sectionKey: 'psalm' },
            { checkboxId: 'gospelCheck', sectionKey: 'gospel' },
            { checkboxId: 'wisdomCheck', sectionKey: 'wisdom' },
            { checkboxId: 'oldTestamentCheck', sectionKey: 'oldTestament' },
            { checkboxId: 'newTestamentCheck', sectionKey: 'newTestament' }
        ];

        checkboxes.forEach(({ checkboxId, sectionKey }) => {
            document.getElementById(checkboxId).addEventListener('change', (e) => {
                if (!this.readingChecks[this.currentDay]) {
                    this.readingChecks[this.currentDay] = {};
                }
                this.readingChecks[this.currentDay][sectionKey] = e.target.checked;
                this.saveProgress();
                this.updateMarkCompleteButtonState();
            });
        });

        // Reset data button
        document.getElementById('resetDataBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // Go to specific day
        document.getElementById('goToDayBtn').addEventListener('click', () => {
            const dayInput = document.getElementById('dayInput');
            const targetDay = parseInt(dayInput.value);
            
            if (targetDay && targetDay >= 1 && targetDay <= 300) {
                this.currentDay = targetDay;
                this.displayCurrentDay();
                this.saveProgress();
                dayInput.value = ''; // Clear input
            } else {
                alert('Please enter a valid day number between 1 and 300.');
            }
        });

        // Allow Enter key to trigger go to day
        document.getElementById('dayInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('goToDayBtn').click();
            }
        });
        
        // Start date modal functionality
        document.getElementById('changeStartDateBtn').addEventListener('click', () => {
            this.showStartDateModal();
        });
        
        document.getElementById('updateStartDateBtn').addEventListener('click', () => {
            this.updateStartDate();
        });
        
        document.getElementById('cancelStartDateBtn').addEventListener('click', () => {
            this.hideStartDateModal();
        });
        
        // Close modal when clicking outside
        document.getElementById('startDateModal').addEventListener('click', (e) => {
            if (e.target.id === 'startDateModal') {
                this.hideStartDateModal();
            }
        });

        // Notification settings modal functionality
        document.getElementById('notificationSettingsBtn').addEventListener('click', () => {
            this.showNotificationModal();
        });
        
        document.getElementById('saveNotificationBtn').addEventListener('click', () => {
            this.saveNotificationSettings();
        });
        
        document.getElementById('cancelNotificationBtn').addEventListener('click', () => {
            this.hideNotificationModal();
        });
        
        // Close notification modal when clicking outside
        document.getElementById('notificationModal').addEventListener('click', (e) => {
            if (e.target.id === 'notificationModal') {
                this.hideNotificationModal();
            }
        });

        // Enable/disable notification categories based on main toggle
        document.getElementById('enableNotifications').addEventListener('change', (e) => {
            this.toggleNotificationUI(e.target.checked);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && this.currentDay > 1) {
                this.currentDay--;
                this.displayCurrentDay();
                this.saveProgress();
            } else if (e.key === 'ArrowRight' && this.currentDay < 300) {
                this.currentDay++;
                this.displayCurrentDay();
                this.saveProgress();
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('markCompleteBtn').click();
            }
        });
    }

    setupPWAInstall() {
        let deferredPrompt;
        const installPrompt = document.getElementById('installPrompt');
        const installBtn = document.getElementById('installBtn');
        const dismissBtn = document.getElementById('dismissInstall');

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install prompt after a delay
            setTimeout(() => {
                installPrompt.classList.remove('hidden');
            }, 3000);
        });

        // Handle install button click
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                
                if (outcome === 'accepted') {
                    console.log('PWA installed');
                }
                
                deferredPrompt = null;
                installPrompt.classList.add('hidden');
            }
        });

        // Handle dismiss button
        dismissBtn.addEventListener('click', () => {
            installPrompt.classList.add('hidden');
            
            // Don't show again for 7 days
            const dismissTime = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem('installPromptDismissed', dismissTime);
        });

        // Check if install prompt was recently dismissed
        const dismissTime = localStorage.getItem('installPromptDismissed');
        if (dismissTime && new Date().getTime() < parseInt(dismissTime)) {
            installPrompt.classList.add('hidden');
        }

        // Hide install prompt if app is already installed
        window.addEventListener('appinstalled', () => {
            installPrompt.classList.add('hidden');
            console.log('PWA was installed');
        });
    }

    // Method to reset all data
    resetAllData() {
        const confirmReset = confirm('⚠️ RESET ALL DATA ⚠️\n\nThis will permanently delete:\n• All completed days\n• All reading checkboxes\n• All text display preferences\n• Your start date and current day\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?');
        
        if (confirmReset) {
            const doubleConfirm = confirm('Last chance! This will erase ALL your progress.\n\nClick OK to permanently reset everything, or Cancel to keep your data.');
            
            if (doubleConfirm) {
                // Clear all data
                localStorage.clear();
                this.completedDays.clear();
                this.readingChecks = {};
                this.showText = {
                    psalm: false,
                    gospel: false,
                    wisdom: false,
                    oldTestament: false,
                    newTestament: false
                };
                this.currentDay = 1;
                this.startDate = new Date();
                
                // Save fresh start date
                localStorage.setItem('bibleReadingStartDate', this.startDate.toISOString());
                
                // Refresh display
                this.displayCurrentDay();
                this.saveProgress();
                
                alert('✅ All data has been reset successfully!\n\nYou\'re starting fresh from Day 1.');
            }
        }
    }

    // Method to reset progress (for testing/development - kept for console access)
    resetProgress() {
        this.resetAllData();
    }

    // Method to jump to specific day
    goToDay(day) {
        if (day >= 1 && day <= 300) {
            this.currentDay = day;
            this.displayCurrentDay();
            this.saveProgress();
        }
    }

    // Method to update start date
    updateStartDate() {
        const dateInput = document.getElementById('startDatePicker');
        
        if (!dateInput.value) {
            alert('Please select a valid date.');
            return;
        }
        
        // Create date in local timezone to avoid timezone issues
        const dateParts = dateInput.value.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        const newStartDate = new Date(year, month, day);
        
        if (isNaN(newStartDate)) {
            alert('Please select a valid date.');
            return;
        }
        
        // Update the start date
        this.startDate = newStartDate;
        localStorage.setItem('bibleReadingStartDate', this.startDate.toISOString());
        
        // Recalculate current day based on new start date
        this.calculateCurrentDay();
        
        // Update the display
        this.displayCurrentDay();
        this.updateProgress();
        this.updateStartDateDisplay();
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        alert(`Start date updated to ${this.startDate.toLocaleDateString('en-US', options)}!`);
        this.hideStartDateModal();
    }
    
    // Method to show start date modal
    showStartDateModal() {
        const modal = document.getElementById('startDateModal');
        const dateInput = document.getElementById('startDatePicker');
        
        // Set the input to show current start date
        const year = this.startDate.getFullYear();
        const month = String(this.startDate.getMonth() + 1).padStart(2, '0');
        const day = String(this.startDate.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        
        modal.classList.remove('hidden');
    }
    
    // Method to hide start date modal
    hideStartDateModal() {
        const modal = document.getElementById('startDateModal');
        modal.classList.add('hidden');
    }

    // Method to show notification settings modal
    showNotificationModal() {
        const modal = document.getElementById('notificationModal');
        
        // Load current settings into the form
        this.loadNotificationModalSettings();
        
        modal.classList.remove('hidden');
    }
    
    // Method to hide notification settings modal
    hideNotificationModal() {
        const modal = document.getElementById('notificationModal');
        modal.classList.add('hidden');
    }
    
    // Method to load settings into notification modal
    loadNotificationModalSettings() {
        // Set main enable checkbox
        document.getElementById('enableNotifications').checked = this.notifications.enabled;
        
        // Set category checkboxes and times
        Object.keys(this.notifications.categories).forEach(category => {
            const checkbox = document.getElementById(`${category}Notification`);
            const timeInput = document.getElementById(`${category}Time`);
            
            if (checkbox) checkbox.checked = this.notifications.categories[category];
            if (timeInput) timeInput.value = this.notifications.times[category];
        });
        
        // Update UI state
        this.toggleNotificationUI(this.notifications.enabled);
    }
    
    // Method to save notification settings from modal
    async saveNotificationSettings() {
        const enabledCheckbox = document.getElementById('enableNotifications');
        const wasEnabled = this.notifications.enabled;
        const nowEnabled = enabledCheckbox.checked;
        
        // If enabling notifications for the first time, request permission
        if (nowEnabled && !wasEnabled) {
            const permissionGranted = await this.requestNotificationPermission();
            if (!permissionGranted) {
                enabledCheckbox.checked = false;
                alert('Notification permission is required to enable notifications.');
                return;
            }
        }
        
        // Update settings
        this.notifications.enabled = nowEnabled;
        
        // Update category settings
        Object.keys(this.notifications.categories).forEach(category => {
            const checkbox = document.getElementById(`${category}Notification`);
            const timeInput = document.getElementById(`${category}Time`);
            
            if (checkbox) this.notifications.categories[category] = checkbox.checked;
            if (timeInput) this.notifications.times[category] = timeInput.value;
        });
        
        // Save to localStorage
        this.saveProgress();
        
        // Schedule notifications if enabled
        if (this.notifications.enabled) {
            this.scheduleAllNotifications();
        } else {
            this.clearAllNotifications();
        }
        
        // Hide modal
        this.hideNotificationModal();
        
        // Show confirmation
        if (nowEnabled) {
            alert('✅ Notification settings saved! You will receive daily reading reminders.');
        } else {
            alert('✅ Notifications disabled.');
        }
    }
    
    // Method to toggle notification UI elements
    toggleNotificationUI(enabled) {
        const categories = ['psalm', 'gospel', 'wisdom', 'oldTestament', 'newTestament'];
        
        categories.forEach(category => {
            const checkbox = document.getElementById(`${category}Notification`);
            const timeInput = document.getElementById(`${category}Time`);
            
            if (checkbox) checkbox.disabled = !enabled;
            if (timeInput) timeInput.disabled = !enabled;
        });
    }
    
    // Method to initialize start date display
    initializeStartDatePicker() {
        this.updateStartDateDisplay();
        this.updateCompletionDate(this.completedDays.size, 0); // Initial calculation
    }
    
    // Method to update start date display in header
    updateStartDateDisplay() {
        const displayElement = document.getElementById('startDateDisplay');
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        displayElement.textContent = this.startDate.toLocaleDateString('en-US', options);
    }
    
    // Method to calculate and update expected completion date
    updateCompletionDate(completedCount, daysMissed) {
        const displayElement = document.getElementById('completionDateDisplay');
        
        // Calculate remaining readings needed
        const remainingReadings = 300 - completedCount;
        
        if (remainingReadings <= 0) {
            displayElement.textContent = "Plan completed!";
            return;
        }
        
        // Start from today and add the remaining readings plus any missed days
        const today = new Date();
        const daysToAdd = remainingReadings + daysMissed;
        
        // Calculate expected completion date
        const completionDate = new Date(today);
        completionDate.setDate(today.getDate() + daysToAdd);
        
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        displayElement.textContent = completionDate.toLocaleDateString('en-US', options);
    }

    // Centralized Bible data loading method
    async ensureBibleDataLoaded() {
        if (!this.bibleData) {
            console.log('Loading Bible data...');
            const response = await fetch('kjv-apocrypha.json');
            const data = await response.json();
            this.bibleData = data.books; // Store just the books object for consistency
            console.log('Bible data loaded successfully!');
        }
    }

    // Bible Navigation Methods
    async initializeBibleNavigation() {
        try {
            await this.ensureBibleDataLoaded();
            this.setupAppNavigation();
            this.loadBibleBooks();
            this.setupBibleNavigationEventListeners();
        } catch (error) {
            console.error('Error initializing Bible navigation:', error);
        }
    }

    setupAppNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetSection = e.target.dataset.section;
                this.switchAppSection(targetSection);
            });
        });
    }

    switchAppSection(sectionName) {
        // Update tab appearance
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
        });
        
        if (sectionName === 'reading-plan') {
            document.getElementById('reading-plan-section').classList.add('active');
        } else if (sectionName === 'full-plan') {
            document.getElementById('full-plan-section').classList.add('active');
            this.loadFullPlanOverview();
        } else if (sectionName === 'bible-navigation') {
            document.getElementById('bible-navigation-section').classList.add('active');
        }
    }

    loadBibleBooks() {
        if (!this.bibleData) return;

        // Traditional Catholic Bible book organization with proper subdivisions
        const bookCategories = {
            'pentateuch-books': ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
            'historical-books': ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Tobit', 'Judith', 'Esther', '1 Maccabees', '2 Maccabees'],
            'wisdom-books': ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Wisdom', 'Sirach'],
            'major-prophets': ['Isaiah', 'Jeremiah', 'Lamentations', 'Baruch', 'Ezekiel', 'Daniel'],
            'minor-prophets': ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'],
            'gospels': ['Matthew', 'Mark', 'Luke', 'John', 'Acts'],
            'epistles': ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'],
            'revelation': ['Revelation']
        };

        // Populate each category
        Object.entries(bookCategories).forEach(([categoryId, books]) => {
            const container = document.getElementById(categoryId);
            if (container) {
                container.innerHTML = '';
                books.forEach(bookName => {
                    if (this.bibleData[bookName]) {
                        const button = document.createElement('button');
                        button.className = 'book-button';
                        button.textContent = bookName;
                        button.onclick = () => this.selectBook(bookName);
                        container.appendChild(button);
                    }
                });
            }
        });
    }

    setupBibleNavigationEventListeners() {
        // Back to books button
        const backToBooks = document.getElementById('backToBooks');
        if (backToBooks) {
            backToBooks.addEventListener('click', () => this.showBooksView());
        }

        // Back to chapters button
        const backToChapters = document.getElementById('backToChapters');
        if (backToChapters) {
            backToChapters.addEventListener('click', () => this.showChaptersView(this.currentBook));
        }

        // Chapter navigation
        const prevChapter = document.getElementById('prevChapter');
        const nextChapter = document.getElementById('nextChapter');
        if (prevChapter) prevChapter.addEventListener('click', () => this.navigateChapter(-1));
        if (nextChapter) nextChapter.addEventListener('click', () => this.navigateChapter(1));
    }

    selectBook(bookName) {
        this.currentBook = bookName;
        this.showChaptersView(bookName);
    }

    showChaptersView(bookName) {
        const bibleNavigation = document.querySelector('.bible-navigation');
        const chapterNavigation = document.getElementById('chapterNavigation');
        const bibleTextDisplay = document.getElementById('bibleTextDisplay');

        // Hide other views
        bibleNavigation.style.display = 'none';
        bibleTextDisplay.classList.add('hidden');
        
        // Show chapter navigation
        chapterNavigation.classList.remove('hidden');
        
        // Update title - keep "Psalms" plural for chapter selection, but individual chapters are singular
        document.getElementById('selectedBookTitle').textContent = `${bookName} - Select Chapter`;
        
        // Load chapters
        const chapterGrid = document.getElementById('chapterGrid');
        chapterGrid.innerHTML = '';
        
        if (this.bibleData[bookName]) {
            const chapters = Object.keys(this.bibleData[bookName]).sort((a, b) => parseInt(a) - parseInt(b));
            chapters.forEach(chapterNum => {
                // Skip special chapters like "3-song" in Bible Navigation
                if (bookName === 'Daniel' && chapterNum === '3-song') {
                    return; // Skip this chapter
                }
                
                const button = document.createElement('button');
                button.className = 'chapter-button';
                button.textContent = chapterNum;
                button.onclick = () => this.selectChapter(bookName, parseInt(chapterNum));
                chapterGrid.appendChild(button);
            });
        }
    }

    selectChapter(bookName, chapterNum) {
        this.currentBook = bookName;
        this.currentChapter = chapterNum;
        this.showTextView(bookName, chapterNum);
    }

    showTextView(bookName, chapterNum) {
        console.log(`DEBUG: showTextView called with ${bookName} ${chapterNum}`);
        
        const chapterNavigation = document.getElementById('chapterNavigation');
        const bibleTextDisplay = document.getElementById('bibleTextDisplay');

        // Hide chapter navigation
        chapterNavigation.classList.add('hidden');
        
        // Show text display
        bibleTextDisplay.classList.remove('hidden');
        
        // Update title - use singular "Psalm" for individual chapters
        const displayBookName = bookName === 'Psalms' ? 'Psalm' : bookName;
        document.getElementById('currentPassageTitle').textContent = `${displayBookName} ${chapterNum}`;
        
        // Load and display text using the same method as reading plan
        try {
            console.log(`DEBUG: Loading ${bookName} ${chapterNum} for Bible Navigation`);
            const chapterText = this.getChapterHtml(bookName, chapterNum);
            const textContent = document.getElementById('bibleTextContent');
            
            console.log(`DEBUG: Chapter text length: ${chapterText ? chapterText.length : 0}`);
            
            if (chapterText && chapterText.trim()) {
                // Log a sample of the text to see if italics are present
                const sampleText = chapterText.substring(0, 500);
                console.log(`DEBUG: Sample text:`, sampleText);
                console.log(`DEBUG: Contains <em>:`, chapterText.includes('<em>'));
                console.log(`DEBUG: Contains italic style:`, chapterText.includes('font-style: italic'));
                
                // EMERGENCY FIX: For Daniel 3, force remove all italics
                if (bookName === 'Daniel' && chapterNum === 3) {
                    console.log('DEBUG: Applying emergency Daniel 3 italic fix');
                    let cleanedText = chapterText
                        .replace(/<em>/gi, '')
                        .replace(/<\/em>/gi, '')
                        .replace(/<i>/gi, '')
                        .replace(/<\/i>/gi, '')
                        .replace(/font-style:\s*italic[^;]*;?/gi, 'font-style: normal !important;')
                        .replace(/style="([^"]*)">/gi, (match, styles) => {
                            // Replace any italic styles with normal
                            const cleanedStyles = styles.replace(/font-style:\s*italic[^;]*;?/gi, 'font-style: normal !important;');
                            return `style="${cleanedStyles}">`;
                        });
                    console.log('DEBUG: After emergency cleaning:', cleanedText.substring(0, 500));
                    textContent.innerHTML = cleanedText;
                } else {
                    textContent.innerHTML = chapterText;
                }
            } else {
                // Try alternative method - get full reference
                const fullReference = `${bookName} ${chapterNum}`;
                const alternativeText = this.getBiblePassage(bookName, fullReference);
                console.log(`DEBUG: Alternative text length: ${alternativeText ? alternativeText.length : 0}`);
                
                if (alternativeText && alternativeText.trim()) {
                    textContent.innerHTML = alternativeText;
                } else {
                    console.error(`DEBUG: No text found for ${bookName} ${chapterNum}`);
                    textContent.innerHTML = `<p>Chapter not found: ${bookName} ${chapterNum}</p>`;
                }
            }
        } catch (error) {
            console.error('Error loading Bible text:', error);
            const textContent = document.getElementById('bibleTextContent');
            textContent.innerHTML = `<p>Error loading chapter: ${bookName} ${chapterNum}</p>`;
        }
    }

    showBooksView() {
        const bibleNavigation = document.querySelector('.bible-navigation');
        const chapterNavigation = document.getElementById('chapterNavigation');
        const bibleTextDisplay = document.getElementById('bibleTextDisplay');

        // Show books view
        bibleNavigation.style.display = 'block';
        
        // Hide other views
        chapterNavigation.classList.add('hidden');
        bibleTextDisplay.classList.add('hidden');
    }

    navigateChapter(direction) {
        if (!this.currentBook || !this.currentChapter) return;
        
        // Filter to only numeric chapters for standard navigation, excluding special chapters like "3-song"
        const allChapters = Object.keys(this.bibleData[this.currentBook]);
        const numericChapters = allChapters
            .filter(ch => /^\d+$/.test(ch)) // Only chapters that are pure numbers
            .sort((a, b) => parseInt(a) - parseInt(b));
        
        console.log(`DEBUG: All chapters for ${this.currentBook}:`, allChapters);
        console.log(`DEBUG: Numeric chapters:`, numericChapters);
        console.log(`DEBUG: Current chapter: ${this.currentChapter}`);
        
        const currentIndex = numericChapters.findIndex(ch => parseInt(ch) === this.currentChapter);
        console.log(`DEBUG: Current index: ${currentIndex}`);
        
        const newIndex = currentIndex + direction;
        console.log(`DEBUG: New index: ${newIndex}`);
        
        if (newIndex >= 0 && newIndex < numericChapters.length) {
            const newChapter = parseInt(numericChapters[newIndex]);
            console.log(`DEBUG: Navigating to chapter: ${newChapter}`);
            this.selectChapter(this.currentBook, newChapter);
        } else {
            console.log(`DEBUG: Navigation blocked - would go out of bounds`);
        }
    }

    // Full Plan Overview Methods
    initializeFullPlanOverview() {
        this.setupFullPlanEventListeners();
    }

    setupFullPlanEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterDays(e.target.dataset.filter);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('planSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchReadings(e.target.value);
            });
        }
    }

    loadFullPlanOverview() {
        const daysGrid = document.getElementById('daysGrid');
        if (!daysGrid) return;

        daysGrid.innerHTML = '';

        for (let day = 1; day <= 300; day++) {
            const dayData = readingPlan[day - 1];
            if (!dayData) continue;

            const dayCard = this.createDayCard(day, dayData);
            daysGrid.appendChild(dayCard);
        }
    }

    createDayCard(dayNumber, dayData) {
        const card = document.createElement('div');
        card.className = 'day-card';
        card.dataset.day = dayNumber;

        // Add status classes
        if (this.completedDays.has(dayNumber)) {
            card.classList.add('completed');
        }
        if (dayNumber === this.currentDay) {
            card.classList.add('current');
        }

        // Determine status
        let status = 'upcoming';
        let statusText = 'Upcoming';
        if (this.completedDays.has(dayNumber)) {
            status = 'completed';
            statusText = 'Completed';
        } else if (dayNumber === this.currentDay) {
            status = 'current';
            statusText = 'Current';
        }

        // Simplify Esther readings for overview display
        let oldTestamentReading = dayData.oldTestament;
        if (dayNumber === 276) {
            oldTestamentReading = 'Esther 1-3';
        } else if (dayNumber === 277) {
            oldTestamentReading = 'Esther 4-5';
        } else if (dayNumber === 278) {
            oldTestamentReading = 'Esther 6-8';
        } else if (dayNumber === 279) {
            oldTestamentReading = 'Esther 9-10';
        }

        // Format Psalm reading to show "Psalm X" instead of just the number
        let psalmReading = dayData.psalm;
        if (psalmReading && !psalmReading.toLowerCase().includes('psalm')) {
            psalmReading = `Psalm ${psalmReading}`;
        }

        card.innerHTML = `
            <div class="day-card-header">
                <div class="day-number">Day ${dayNumber}</div>
                <div class="day-status ${status}">${statusText}</div>
            </div>
            <div class="day-readings">
                <div class="reading-item">
                    <span class="reading-type">Psalm:</span>
                    <span class="reading-ref">${psalmReading}</span>
                </div>
                <div class="reading-item">
                    <span class="reading-type">Gospel:</span>
                    <span class="reading-ref">${dayData.gospel}</span>
                </div>
                <div class="reading-item">
                    <span class="reading-type">Wisdom:</span>
                    <span class="reading-ref">${dayData.wisdom}</span>
                </div>
                <div class="reading-item">
                    <span class="reading-type">Old Test:</span>
                    <span class="reading-ref">${oldTestamentReading}</span>
                </div>
                <div class="reading-item">
                    <span class="reading-type">New Test:</span>
                    <span class="reading-ref">${dayData.newTestament}</span>
                </div>
            </div>
        `;

        // Add click handler to navigate to day
        card.addEventListener('click', () => {
            this.currentDay = dayNumber;
            this.displayCurrentDay();
            this.saveProgress();
            this.switchAppSection('reading-plan');
        });

        return card;
    }

    filterDays(filter) {
        const dayCards = document.querySelectorAll('.day-card');
        
        dayCards.forEach(card => {
            const dayNumber = parseInt(card.dataset.day);
            let show = false;

            switch (filter) {
                case 'all':
                    show = true;
                    break;
                case 'completed':
                    show = this.completedDays.has(dayNumber);
                    break;
                case 'remaining':
                    show = !this.completedDays.has(dayNumber);
                    break;
            }

            card.style.display = show ? 'block' : 'none';
        });
    }

    searchReadings(query) {
        if (!query.trim()) {
            // Show all cards if search is empty
            document.querySelectorAll('.day-card').forEach(card => {
                card.style.display = 'block';
            });
            return;
        }

        const dayCards = document.querySelectorAll('.day-card');
        const searchTerm = query.toLowerCase();

        dayCards.forEach(card => {
            const readings = card.querySelectorAll('.reading-ref');
            let hasMatch = false;

            readings.forEach(reading => {
                if (reading.textContent.toLowerCase().includes(searchTerm)) {
                    hasMatch = true;
                }
            });

            // Also check day number
            const dayNumber = card.querySelector('.day-number').textContent.toLowerCase();
            if (dayNumber.includes(searchTerm)) {
                hasMatch = true;
            }

            card.style.display = hasMatch ? 'block' : 'none';
        });
    }

}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Check for required DOM elements first
    const requiredElements = [
        'currentDay', 'dayTitle', 'progressFill', 'completedDays', 'remainingDays', 
        'bufferDays', 'percentComplete', 'streakDays', 'daysAhead', 'daysMissed',
        'psalmRef', 'gospelRef', 'wisdomRef', 'oldTestamentRef', 'newTestamentRef',
        'psalmText', 'gospelText', 'wisdomText', 'oldTestamentText', 'newTestamentText',
        'prevDay', 'nextDay', 'markCompleteBtn', 'resetDataBtn',
        'togglePsalmBtn', 'toggleGospelBtn', 'toggleWisdomBtn', 'toggleOldTestamentBtn', 'toggleNewTestamentBtn',
        'psalmCheck', 'gospelCheck', 'wisdomCheck', 'oldTestamentCheck', 'newTestamentCheck',
        'dayInput', 'goToDayBtn',
        'installPrompt', 'installBtn', 'dismissInstall'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing DOM elements:', missingElements);
        return;
    } else {
        console.log('All required DOM elements found');
    }
    
    // Make sure reading plan is available
    if (typeof readingPlan !== 'undefined') {
        console.log('Reading plan found, creating app...');
        try {
            window.app = new BibleReadingApp();
            console.log('App initialized successfully!');
            
            // Expose useful methods for debugging/development
            window.resetProgress = () => window.app.resetProgress();
            window.goToDay = (day) => window.app.goToDay(day);
            window.markCompleted = (day) => {
                window.app.completedDays.add(day);
                window.app.updateProgress();
                window.app.saveProgress();
            };
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    } else {
        console.error('Reading plan not found. Make sure readingPlan.js is loaded.');
    }
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}