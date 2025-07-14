// Application State
let currentUser = {
    role: 'operario',
    isAuthenticated: false
};

let currentScreen = 'login';
let currentChecklist = null;
let checklists = [];

// Constants
const ROLES = {
    OPERARIO: 'operario',
    AUDITOR: 'auditor',
    INGENIERO: 'ingeniero'
};

const PASSWORDS = {
    INGENIERO: 'Calidad2026',
    AUDITOR: 'Finotex2026'
};

const DEFAULT_SETTINGS = {
    email: 'finotex.default@gmail.com',
    expiration: 1440, // 24 hours in minutes
    waitTime: 10, // 10 minutes
    emailjsServiceId: 'service_default',
    emailjsTemplateId: 'template_default',
    emailjsPublicKey: 'your_public_key'
};

// EmailJS Configuration
let emailjsInitialized = false;

function initializeEmailJS() {
    if (!emailjsInitialized) {
        const settings = loadSettings();
        if (window.emailjs && settings.emailjsPublicKey) {
            emailjs.init(settings.emailjsPublicKey);
            emailjsInitialized = true;
        }
    }
}

// Utility Functions
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function showScreen(screenId) {
    // Hide all screens
    $$('.screen').forEach(screen => screen.classList.remove('active'));
    
    // Show target screen
    const targetScreen = $(`#${screenId}Screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }
}

function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForFilename(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Local Storage Functions
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

function saveChecklists() {
    saveToStorage('checklists', checklists);
}

function loadChecklists() {
    checklists = loadFromStorage('checklists', []);
    // Clean old checklists (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    checklists = checklists.filter(checklist => {
        const checklistDate = new Date(checklist.timestamp);
        return checklistDate > sevenDaysAgo;
    });
    
    saveChecklists();
}

function saveSettings(settings) {
    saveToStorage('app_settings', settings);
}

function loadSettings() {
    return loadFromStorage('app_settings', DEFAULT_SETTINGS);
}

// File handling functions
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

// Authentication Functions
function login(role, password = '') {
    if (role === ROLES.INGENIERO && password !== PASSWORDS.INGENIERO) {
        showToast('Contraseña incorrecta para Ingeniero', 'error');
        return false;
    }
    
    if (role === ROLES.AUDITOR && password !== PASSWORDS.AUDITOR) {
        showToast('Contraseña incorrecta para Auditor', 'error');
        return false;
    }
    
    currentUser.role = role;
    currentUser.isAuthenticated = true;
    
    saveToStorage('userRole', role);
    saveToStorage('isAuthenticated', 'true');
    
    return true;
}

function logout() {
    currentUser.role = ROLES.OPERARIO;
    currentUser.isAuthenticated = false;
    
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
    
    showScreen('login');
}

function checkAuth() {
    const savedRole = loadFromStorage('userRole');
    const isAuth = loadFromStorage('isAuthenticated');
    
    if (savedRole && isAuth === 'true') {
        currentUser.role = savedRole;
        currentUser.isAuthenticated = true;
        return true;
    }
    
    return false;
}

// UI Update Functions
function updateRoleIndicators() {
    const roleText = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    const roleIcons = {
        operario: '👷‍♂️',
        auditor: '🔍',
        ingeniero: '⚙️'
    };
    
    // Update main menu role indicator
    const roleIndicator = $('#roleIndicator');
    if (roleIndicator) {
        roleIndicator.className = `role-indicator ${currentUser.role}`;
        $('#roleIcon').textContent = roleIcons[currentUser.role];
        $('#roleText').textContent = roleText;
    }
    
    // Update form role indicator
    const formRoleText = $('#formRoleText');
    if (formRoleText) {
        formRoleText.textContent = roleText;
    }
    
    // Update settings role text
    const settingsRoleText = $('#settingsRoleText');
    if (settingsRoleText) {
        settingsRoleText.textContent = roleText;
    }
    
    // Update modal role text
    const modalUserRole = $('#modalUserRole');
    if (modalUserRole) {
        modalUserRole.textContent = roleText;
    }
}

function updateRoleDescription() {
    const descriptions = {
        operario: [
            '• Puedes crear y completar nuevos checklists',
            '• Acceso al historial de tus checklists',
            '• Los checklists deben ser aprobados por auditores o ingenieros'
        ],
        auditor: [
            '• Puedes aprobar checklists creados por operarios',
            '• Acceso completo al historial de checklists',
            '• Puedes ver la configuración del sistema'
        ],
        ingeniero: [
            '• Acceso completo a todas las funciones del sistema',
            '• Puedes aprobar checklists y modificar configuraciones',
            '• Control total sobre parámetros del sistema'
        ]
    };
    
    const roleDescription = $('#roleDescription');
    if (roleDescription) {
        roleDescription.innerHTML = descriptions[currentUser.role]
            .map(desc => `<p>${desc}</p>`)
            .join('');
    }
}

function updateCurrentDate() {
    const currentDate = $('#currentDate');
    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function updateMenuButtons() {
    const settingsBtn = $('#settingsBtn');
    if (settingsBtn) {
        if (currentUser.role === ROLES.AUDITOR || currentUser.role === ROLES.INGENIERO) {
            settingsBtn.classList.remove('hidden');
        } else {
            settingsBtn.classList.add('hidden');
        }
    }
}

function updateFormButtons() {
    const saveBtn = $('#saveChecklistBtn');
    const approveBtn = $('#approveChecklistBtn');
    
    if (saveBtn && approveBtn) {
        if (currentUser.role === ROLES.OPERARIO) {
            saveBtn.classList.remove('hidden');
            approveBtn.classList.add('hidden');
        } else {
            saveBtn.classList.add('hidden');
            approveBtn.classList.remove('hidden');
        }
    }
}

// Form Functions
function updateCompletionStatus() {
    const form = $('#checklistForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const totalFields = form.querySelectorAll('input, textarea').length;
    let filledFields = 0;
    
    for (let [key, value] of formData.entries()) {
        if (value && value.toString().trim() !== '') {
            filledFields++;
        }
    }
    
    const percentage = Math.round((filledFields / totalFields) * 100);
    
    const percentageEl = $('#completionPercentage');
    const progressFill = $('#progressFill');
    const completionText = $('#completionText');
    
    if (percentageEl) percentageEl.textContent = percentage;
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        progressFill.className = 'progress-fill';
        if (percentage < 30) progressFill.classList.add('low');
        else if (percentage < 70) progressFill.classList.add('medium');
        else progressFill.classList.add('high');
    }
    if (completionText) {
        completionText.textContent = percentage < 100 ? 'Formulario en progreso' : '¡Formulario completo!';
    }
}

function resetForm() {
    const form = $('#checklistForm');
    if (form) {
        form.reset();
        
        // Clear file previews
        const photoPreview = $('#photoPreview');
        const filePreview = $('#filePreview');
        
        if (photoPreview) {
            photoPreview.classList.add('hidden');
            photoPreview.innerHTML = '';
        }
        
        if (filePreview) {
            filePreview.classList.add('hidden');
            filePreview.innerHTML = '';
        }
        
        updateCompletionStatus();
    }
}

async function saveChecklist() {
    const form = $('#checklistForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const checklistData = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        if (key === 'foto' || key === 'archivo') {
            // Handle file inputs
            if (value && value.size > 0) {
                try {
                    checklistData[key] = await fileToBase64(value);
                    checklistData[key + '_name'] = value.name;
                    checklistData[key + '_type'] = value.type;
                } catch (error) {
                    console.error('Error converting file to base64:', error);
                }
            }
        } else {
            checklistData[key] = value;
        }
    }
    
    // Validate required fields
    const requiredFields = ['op', 'ficha', 'cliente', 'cantidad', 'nombreOperario'];
    const missingFields = requiredFields.filter(field => !checklistData[field] || checklistData[field].trim() === '');
    
    if (missingFields.length > 0) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }
    
    // Add metadata
    checklistData.id = generateId();
    checklistData.timestamp = new Date().toISOString();
    checklistData.aprobado = false;
    checklistData.revisado = false;
    checklistData.operario = checklistData.nombreOperario;
    checklistData.createdBy = currentUser.role;
    
    // Add to checklists array
    checklists.push(checklistData);
    saveChecklists();
    
    showToast(`Checklist ${checklistData.op} guardado correctamente`, 'success');
    
    // Schedule automatic email if not approved within 24 hours
    scheduleAutomaticEmail(checklistData.id);
    
    // Navigate back to main menu after a delay
    setTimeout(() => {
        showScreen('mainMenu');
        resetForm();
    }, 1500);
}

async function approveChecklist(checklistId) {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    // Get observations from viewer if available
    const observationsTextarea = document.querySelector('.viewer-observation-value.auditor textarea');
    if (observationsTextarea) {
        checklist.observaciones = observationsTextarea.value;
    }
    
    checklist.aprobado = true;
    checklist.fechaAprobacion = new Date().toISOString();
    checklist.aprobadoPor = currentUser.role;
    
    saveChecklists();
    showToast(`Checklist ${checklist.op} aprobado correctamente`, 'success');
    
    // Generate and send PDF automatically
    try {
        await generateAndSendPDF(checklist);
    } catch (error) {
        console.error('Error generating/sending PDF:', error);
        showToast('Error al generar o enviar el PDF', 'error');
    }
    
    // Close modal if open
    closeModal('checklistViewerModal');
    
    // Refresh history if on history screen
    if (currentScreen === 'history') {
        renderHistory();
    }
}

// PDF Generation Functions
async function generatePDF(checklist) {
    if (!window.jsPDF) {
        throw new Error('jsPDF library not loaded');
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(185, 28, 28); // Red color
    doc.text('CHECKLIST THERMAL', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Orden de Producción: ${checklist.op}`, 20, 35);
    doc.text(`Fecha: ${formatDate(checklist.timestamp)}`, 20, 45);
    
    // Status
    const status = getChecklistStatus(checklist);
    doc.setFontSize(10);
    doc.setTextColor(status === 'aprobado' ? 0 : 255, status === 'aprobado' ? 128 : 0, 0);
    doc.text(`Estado: ${status.toUpperCase()}`, 150, 35);
    
    // Reset color
    doc.setTextColor(0, 0, 0);
    
    let yPosition = 60;
    
    // Information sections
    const sections = [
        {
            title: 'INFORMACIÓN GENERAL',
            fields: [
                { label: 'Operario', value: checklist.operario },
                { label: 'Máquina', value: checklist.maquina || 'N/A' },
                { label: 'Cliente', value: checklist.cliente },
                { label: 'Cantidad', value: checklist.cantidad },
                { label: 'Hora de inicio', value: checklist.hora || 'N/A' }
            ]
        },
        {
            title: 'ESPECIFICACIONES',
            fields: [
                { label: 'Código de Diseño', value: checklist.ficha },
                { label: 'Largo', value: checklist.largo || 'N/A' },
                { label: 'Ancho', value: checklist.ancho || 'N/A' },
                { label: 'Pigmento', value: checklist.pigmento || 'N/A' },
                { label: 'Base', value: checklist.base || 'N/A' }
            ]
        },
        {
            title: 'PARÁMETROS DE PRODUCCIÓN',
            fields: [
                { label: 'Temperatura Cabezal 1', value: checklist.temp1 || 'N/A' },
                { label: 'Temperatura Cabezal 2', value: checklist.temp2 || 'N/A' },
                { label: 'Velocidad (mm/s)', value: checklist.velocidad || 'N/A' },
                { label: 'Desperdicio Implícito', value: checklist.desperdicio1 || 'N/A' },
                { label: 'Desperdicio Explícito', value: checklist.desperdicio2 || 'N/A' }
            ]
        }
    ];
    
    sections.forEach(section => {
        // Section title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, 20, yPosition);
        yPosition += 10;
        
        // Section fields
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        section.fields.forEach(field => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.text(`${field.label}: ${field.value}`, 25, yPosition);
            yPosition += 7;
        });
        
        yPosition += 5;
    });
    
    // Observations
    if (checklist.observacionesOperario || checklist.observaciones) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVACIONES', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        if (checklist.observacionesOperario) {
            doc.text('Observaciones del Operario:', 25, yPosition);
            yPosition += 7;
            const operarioLines = doc.splitTextToSize(checklist.observacionesOperario, 160);
            doc.text(operarioLines, 25, yPosition);
            yPosition += operarioLines.length * 5 + 5;
        }
        
        if (checklist.observaciones) {
            doc.text('Observaciones del Auditor/Ingeniero:', 25, yPosition);
            yPosition += 7;
            const auditorLines = doc.splitTextToSize(checklist.observaciones, 160);
            doc.text(auditorLines, 25, yPosition);
            yPosition += auditorLines.length * 5 + 5;
        }
    }
    
    // Approval information
    if (checklist.aprobado) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 128, 0);
        doc.text('CHECKLIST APROBADO', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Aprobado por: ${checklist.aprobadoPor}`, 25, yPosition);
        yPosition += 7;
        doc.text(`Fecha de aprobación: ${formatDate(checklist.fechaAprobacion)}`, 25, yPosition);
    }
    
    // Add images if available
    if (checklist.foto) {
        try {
            doc.addPage();
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('FOTO DE PRIMERA PIEZA', 20, 20);
            
            // Add image
            const imgWidth = 150;
            const imgHeight = 100;
            doc.addImage(checklist.foto, 'JPEG', 20, 30, imgWidth, imgHeight);
        } catch (error) {
            console.error('Error adding image to PDF:', error);
        }
    }
    
    return doc;
}

async function generateAndSendPDF(checklist, customEmail = null) {
    try {
        showToast('Generando PDF...', 'info');
        
        // Generate PDF
        const doc = await generatePDF(checklist);
        const pdfBlob = doc.output('blob');
        
        // Get email settings
        const settings = loadSettings();
        const emailTo = customEmail || settings.email;
        
        // Send email with PDF
        await sendEmailWithPDF(checklist, pdfBlob, emailTo);
        
        showToast(`PDF generado y enviado a ${emailTo}`, 'success');
        
    } catch (error) {
        console.error('Error generating/sending PDF:', error);
        showToast('Error al generar o enviar el PDF. Verifique la configuración de correo.', 'error');
    }
}

async function downloadPDF(checklistId, customEmail = null) {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    currentChecklist = checklist;
    
    // Check if user can specify custom email
    if ((currentUser.role === ROLES.AUDITOR || currentUser.role === ROLES.INGENIERO) && !customEmail) {
        $('#emailChecklistOP').textContent = checklist.op;
        showModal('emailInputModal');
    } else {
        // Generate and download PDF
        try {
            const doc = await generatePDF(checklist);
            const filename = `${checklist.op} - ${formatDateForFilename(checklist.timestamp)}.pdf`;
            doc.save(filename);
            
            // Also send by email if specified
            if (customEmail) {
                await generateAndSendPDF(checklist, customEmail);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('Error al generar el PDF', 'error');
        }
    }
}

// Email Functions
async function sendEmailWithPDF(checklist, pdfBlob, emailTo) {
    initializeEmailJS();
    
    if (!emailjsInitialized) {
        // Simulate email sending for demo purposes
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Simulated email sent to ${emailTo} with PDF for checklist ${checklist.op}`);
                resolve();
            }, 1000);
        });
    }
    
    try {
        const settings = loadSettings();
        
        // Convert PDF blob to base64
        const reader = new FileReader();
        const pdfBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
        });
        
        const templateParams = {
            to_email: emailTo,
            checklist_op: checklist.op,
            cliente: checklist.cliente,
            operario: checklist.operario,
            fecha: formatDate(checklist.timestamp),
            pdf_attachment: pdfBase64,
            pdf_filename: `${checklist.op} - ${formatDateForFilename(checklist.timestamp)}.pdf`
        };
        
        await emailjs.send(
            settings.emailjsServiceId,
            settings.emailjsTemplateId,
            templateParams
        );
        
    } catch (error) {
        console.error('EmailJS error:', error);
        // Fallback to simulation
        console.log(`Simulated email sent to ${emailTo} with PDF for checklist ${checklist.op}`);
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function updateEmailValidation() {
    const emailInput = $('#emailInput');
    const emailValidation = $('#emailValidation');
    const emailError = $('#emailError');
    const sendBtn = $('#sendEmailBtn');
    
    if (!emailInput || !emailValidation || !sendBtn) return;
    
    const email = emailInput.value;
    const isValid = validateEmail(email);
    
    if (email) {
        if (isValid) {
            emailValidation.className = 'validation-icon valid';
            emailError.classList.add('hidden');
            sendBtn.disabled = false;
        } else {
            emailValidation.className = 'validation-icon invalid';
            emailError.classList.remove('hidden');
            sendBtn.disabled = true;
        }
    } else {
        emailValidation.className = 'validation-icon';
        emailError.classList.add('hidden');
        sendBtn.disabled = true;
    }
}

// Automatic email scheduling
function scheduleAutomaticEmail(checklistId) {
    const settings = loadSettings();
    const expirationTime = settings.expiration * 60 * 1000; // Convert minutes to milliseconds
    
    setTimeout(async () => {
        const checklist = checklists.find(c => c.id === checklistId);
        if (checklist && !checklist.aprobado) {
            try {
                await generateAndSendPDF(checklist);
                showToast(`Checklist ${checklist.op} enviado automáticamente por vencimiento`, 'warning');
            } catch (error) {
                console.error('Error sending automatic email:', error);
            }
        }
    }, expirationTime);
}

// History Functions
function renderHistory() {
    const historyGrid = $('#historyGrid');
    const emptyState = $('#emptyState');
    const noResultsState = $('#noResultsState');
    const filteredCount = $('#filteredCount');
    const totalCount = $('#totalCount');
    
    if (!historyGrid) return;
    
    const searchTerm = $('#searchInput').value.toLowerCase();
    const statusFilter = $('#statusFilter').value;
    
    let filteredChecklists = checklists.filter(checklist => {
        const matchesSearch = 
            checklist.op.toLowerCase().includes(searchTerm) ||
            checklist.ficha.toLowerCase().includes(searchTerm) ||
            checklist.cliente.toLowerCase().includes(searchTerm) ||
            checklist.operario.toLowerCase().includes(searchTerm);
        
        let matchesFilter = true;
        if (statusFilter !== 'todos') {
            const status = getChecklistStatus(checklist);
            matchesFilter = status === statusFilter.slice(0, -1); // Remove 's' from plural
        }
        
        return matchesSearch && matchesFilter;
    });
    
    // Update stats
    if (filteredCount) filteredCount.textContent = filteredChecklists.length;
    if (totalCount) totalCount.textContent = checklists.length;
    
    // Clear grid
    historyGrid.innerHTML = '';
    
    // Show appropriate state
    if (checklists.length === 0) {
        emptyState.classList.remove('hidden');
        noResultsState.classList.add('hidden');
        historyGrid.classList.add('hidden');
    } else if (filteredChecklists.length === 0) {
        emptyState.classList.add('hidden');
        noResultsState.classList.remove('hidden');
        historyGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        noResultsState.classList.add('hidden');
        historyGrid.classList.remove('hidden');
        
        // Render checklist cards
        filteredChecklists.forEach(checklist => {
            const card = createChecklistCard(checklist);
            historyGrid.appendChild(card);
        });
    }
}

function getChecklistStatus(checklist) {
    if (checklist.aprobado) return 'aprobado';
    
    const now = new Date();
    const created = new Date(checklist.timestamp);
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) return 'vencido';
    return 'pendiente';
}

function getStatusBadgeClass(status) {
    const classes = {
        aprobado: 'aprobado',
        pendiente: 'pendiente',
        vencido: 'vencido'
    };
    return classes[status] || 'en-progreso';
}

function getStatusIcon(status) {
    const icons = {
        aprobado: '✓',
        pendiente: '⏳',
        vencido: '⚠️'
    };
    return icons[status] || '•';
}

function createChecklistCard(checklist) {
    const card = document.createElement('div');
    card.className = 'checklist-card';
    
    const status = getChecklistStatus(checklist);
    const statusClass = getStatusBadgeClass(status);
    const statusIcon = getStatusIcon(status);
    
    // Show download button only for auditors and engineers
    const showDownloadBtn = currentUser.role === ROLES.AUDITOR || currentUser.role === ROLES.INGENIERO;
    
    card.innerHTML = `
        <div class="checklist-card-header">
            <div class="checklist-card-title">
                <h3>${checklist.op}</h3>
                <p>${checklist.cliente}</p>
                <span class="saved-badge">Guardado</span>
            </div>
            <div class="checklist-card-actions">
                <div class="status-badge ${statusClass}">
                    <span>${statusIcon}</span>
                    <span>${status.toUpperCase()}</span>
                </div>
                <button class="delete-button" onclick="deleteChecklist('${checklist.id}')" title="Eliminar checklist">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                </button>
            </div>
        </div>
        
        <div class="checklist-card-details">
            <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m6-12h-6m-6 0h6"/>
                </svg>
                <span>Código: ${checklist.ficha}</span>
            </div>
            <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Operario: ${checklist.operario}</span>
            </div>
            <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${formatDate(checklist.timestamp)}</span>
            </div>
            ${checklist.aprobado && checklist.aprobadoPor ? `
                <div class="detail-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Auditor: ${checklist.aprobadoPor}</span>
                </div>
            ` : ''}
            <div class="detail-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m6-12h-6m-6 0h6"/>
                </svg>
                <span>Máquina: ${checklist.maquina || 'N/A'}</span>
            </div>
        </div>
        
        <div class="checklist-card-buttons">
            <button class="view-button" onclick="viewChecklist('${checklist.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                Ver Checklist
            </button>
            ${showDownloadBtn ? `
                <button class="download-button" onclick="downloadPDF('${checklist.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar PDF
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

function deleteChecklist(checklistId) {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    if (confirm(`¿Estás seguro de que quieres eliminar el checklist ${checklist.op}?\n\nEsta acción no se puede deshacer.`)) {
        checklists = checklists.filter(c => c.id !== checklistId);
        saveChecklists();
        showToast(`Checklist ${checklist.op} eliminado correctamente`, 'success');
        renderHistory();
    }
}

function viewChecklist(checklistId) {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;
    
    currentChecklist = checklist;
    renderChecklistViewer(checklist);
    showModal('checklistViewerModal');
}

// Modal Functions
function showModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
        modal.classList.remove('active');
    }
}

function renderChecklistViewer(checklist) {
    const content = $('#checklistViewerContent');
    const title = $('#modalChecklistTitle');
    const status = $('#modalChecklistStatus');
    const approveBtn = $('#approveFromViewerBtn');
    
    if (!content) return;
    
    // Update modal header
    if (title) title.textContent = `Checklist ${checklist.op}`;
    
    const checklistStatus = getChecklistStatus(checklist);
    const statusClass = getStatusBadgeClass(checklistStatus);
    const statusIcon = getStatusIcon(checklistStatus);
    
    if (status) {
        status.className = `status-badge ${statusClass}`;
        status.innerHTML = `<span>${statusIcon}</span> <span>${checklistStatus.toUpperCase()}</span>`;
    }
    
    // Show/hide approve button
    if (approveBtn) {
        const canApprove = (currentUser.role === ROLES.AUDITOR || currentUser.role === ROLES.INGENIERO) && 
                          !checklist.aprobado;
        
        if (canApprove) {
            approveBtn.classList.remove('hidden');
            approveBtn.onclick = () => approveChecklist(checklist.id);
        } else {
            approveBtn.classList.add('hidden');
        }
    }
    
    // Render content
    content.innerHTML = `
        <div class="viewer-basic-info">
            <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Información General
            </h3>
            <div class="viewer-info-grid">
                <div class="viewer-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Operario: ${checklist.operario}</span>
                </div>
                <div class="viewer-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Fecha: ${formatDate(checklist.timestamp)}</span>
                </div>
                <div class="viewer-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v6m0 6v6m6-12h-6m-6 0h6"/>
                    </svg>
                    <span>Máquina: ${checklist.maquina || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="viewer-form-grid">
            <div class="viewer-section">
                <h3>Información del Producto</h3>
                ${renderViewerField('Código de Diseño', checklist.ficha)}
                ${renderViewerField('Cliente', checklist.cliente)}
                ${renderViewerField('Cantidad', checklist.cantidad)}
                ${renderViewerField('Largo', checklist.largo)}
                ${renderViewerField('Ancho', checklist.ancho)}
                ${renderViewerField('Pigmento', checklist.pigmento)}
                ${renderViewerField('Base', checklist.base)}
            </div>
            
            <div class="viewer-section">
                <h3>Parámetros de Producción</h3>
                ${renderViewerField('Temperatura Cabezal 1', checklist.temp1)}
                ${renderViewerField('Temperatura Cabezal 2', checklist.temp2)}
                ${renderViewerField('Velocidad (mm/s)', checklist.velocidad)}
                ${renderViewerField('Desperdicio Implícito', checklist.desperdicio1)}
                ${renderViewerField('Desperdicio Explícito', checklist.desperdicio2)}
                ${renderViewerField('Hora de Inicio', checklist.hora)}
            </div>
        </div>
        
        <div class="viewer-observations">
            <h3>Observaciones</h3>
            
            ${checklist.observacionesOperario ? `
                <div class="viewer-observation-section">
                    <label>Observaciones del Operario</label>
                    <div class="viewer-observation-value operator">
                        ${checklist.observacionesOperario}
                    </div>
                </div>
            ` : ''}
            
            <div class="viewer-observation-section">
                <label>Observaciones del Auditor/Ingeniero</label>
                <div class="viewer-observation-value auditor">
                    ${currentUser.role === ROLES.AUDITOR || currentUser.role === ROLES.INGENIERO ? 
                        `<textarea placeholder="Agregar observaciones..." rows="4">${checklist.observaciones || ''}</textarea>` :
                        (checklist.observaciones || 'Sin observaciones')
                    }
                </div>
            </div>
        </div>
        
        ${(checklist.foto || checklist.archivo) ? `
            <div class="viewer-files">
                <h3>Archivos Adjuntos</h3>
                <div class="viewer-files-grid">
                    ${checklist.foto ? `
                        <div class="viewer-file-section">
                            <label>Foto de Primera Pieza</label>
                            <div class="viewer-file-preview">
                                <img src="${checklist.foto}" alt="Primera pieza">
                            </div>
                        </div>
                    ` : ''}
                    
                    ${checklist.archivo ? `
                        <div class="viewer-file-section">
                            <label>Archivo Data Variable (${checklist.archivo_name || 'archivo'})</label>
                            <div class="viewer-file-placeholder">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10,9 9,9 8,9"/>
                                </svg>
                                <span>Archivo adjunto: ${checklist.archivo_name || 'archivo'}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
        
        ${checklist.aprobado && checklist.aprobadoPor ? `
            <div class="viewer-approval-info">
                <div class="approval-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                    <div>
                        <p><strong>Checklist Aprobado</strong></p>
                        <div class="approval-details">
                            Aprobado por: ${checklist.aprobadoPor}
                            ${checklist.fechaAprobacion ? ` el ${formatDate(checklist.fechaAprobacion)}` : ''}
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

function renderViewerField(label, value) {
    return `
        <div class="viewer-field">
            <label>${label}</label>
            <div class="viewer-field-value">${value || 'No especificado'}</div>
        </div>
    `;
}

// Settings Functions
function loadSettingsUI() {
    const settings = loadSettings();
    const emailSetting = $('#emailSetting');
    const expirationSetting = $('#expirationSetting');
    const waitTimeSetting = $('#waitTimeSetting');
    const saveBtn = $('#saveSettingsBtn');
    const restrictedMessage = $('#restrictedMessage');
    const saveContainer = $('#saveSettingsContainer');
    const emailHelpText = $('#emailHelpText');
    
    if (emailSetting) emailSetting.value = settings.email;
    if (expirationSetting) expirationSetting.value = settings.expiration;
    if (waitTimeSetting) waitTimeSetting.value = settings.waitTime;
    
    const isEngineer = currentUser.role === ROLES.INGENIERO;
    
    // Enable/disable inputs based on role
    if (emailSetting) emailSetting.disabled = !isEngineer;
    if (expirationSetting) expirationSetting.disabled = !isEngineer;
    if (waitTimeSetting) waitTimeSetting.disabled = !isEngineer;
    
    // Show/hide elements based on role
    if (saveContainer) {
        if (isEngineer) {
            saveContainer.classList.remove('hidden');
        } else {
            saveContainer.classList.add('hidden');
        }
    }
    
    if (restrictedMessage) {
        if (isEngineer) {
            restrictedMessage.classList.add('hidden');
            togglePassword.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>`;
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const role = roleSelect.value;
            const password = passwordInput.value;
            
            loginBtn.disabled = true;
            loginBtn.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center;">
                    <div style="animate: spin; border-radius: 50%; width: 1.25rem; height: 1.25rem; border: 2px solid transparent; border-top: 2px solid white; margin-right: 0.5rem;"></div>
                    Iniciando sesión...
                </div>
            `;
            
            setTimeout(() => {
                if (login(role, password)) {
                // Add observations if they exist
                if (checklist.observacionesOperario || checklist.observaciones) {
                    pdfContent += `
                    updateMenuButtons();
                    showScreen('mainMenu');
                }
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Entrar';
            }, 800);
        });
    }
    
    // Handle Enter key in password input
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    }
    
    // Main menu buttons
    const logoutBtn = $('#logoutBtn');
    const newChecklistBtn = $('#newChecklistBtn');
    const historyBtn = $('#historyBtn');
    const settingsBtn = $('#settingsBtn');
    
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (newChecklistBtn) newChecklistBtn.addEventListener('click', () => {
        resetForm();
        updateFormButtons();
        showScreen('checklistForm');
    });
    if (historyBtn) historyBtn.addEventListener('click', () => {
        renderHistory();
        showScreen('history');
    });
    if (settingsBtn) settingsBtn.addEventListener('click', () => {
        loadSettingsUI();
        showScreen('settings');
    });
    
    // Back buttons
    const backToMenuBtn = $('#backToMenuBtn');
    const backToMenuFromHistoryBtn = $('#backToMenuFromHistoryBtn');
    const backToMenuFromSettingsBtn = $('#backToMenuFromSettingsBtn');
    
    if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => showScreen('mainMenu'));
    if (backToMenuFromHistoryBtn) backToMenuFromHistoryBtn.addEventListener('click', () => showScreen('mainMenu'));
    if (backToMenuFromSettingsBtn) backToMenuFromSettingsBtn.addEventListener('click', () => showScreen('mainMenu'));
    
    // Form events
    const checklistForm = $('#checklistForm');
    const resetBtn = $('#resetBtn');
    const printBtn = $('#printBtn');
    const saveChecklistBtn = $('#saveChecklistBtn');
    const approveChecklistBtn = $('#approveChecklistBtn');
    
    if (checklistForm) {
        checklistForm.addEventListener('input', updateCompletionStatus);
        checklistForm.addEventListener('change', updateCompletionStatus);
    }
    
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres reiniciar el formulario? Se perderán todos los datos.')) {
            resetForm();
        }
    });
    
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    if (saveChecklistBtn) saveChecklistBtn.addEventListener('click', saveChecklist);
    if (approveChecklistBtn) approveChecklistBtn.addEventListener('click', () => {
        // This would be used for approving from the form itself
        showToast('Funcionalidad de aprobación desde formulario', 'info');
    });
    
    // File input handlers
    const photoInput = $('input[name="foto"]');
    const fileInput = $('input[name="archivo"]');
    
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = $('#photoPreview');
            
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
                    preview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                preview.classList.add('hidden');
                preview.innerHTML = '';
            }
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = $('#filePreview');
            
            if (file) {
                preview.innerHTML = `<p>Archivo seleccionado: ${file.name}</p>`;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
                preview.innerHTML = '';
            }
        });
    }
    
    // History search and filter
    const searchInput = $('#searchInput');
    const statusFilter = $('#statusFilter');
    const createFirstChecklistBtn = $('#createFirstChecklistBtn');
    
    if (searchInput) searchInput.addEventListener('input', renderHistory);
    if (statusFilter) statusFilter.addEventListener('change', renderHistory);
    if (createFirstChecklistBtn) createFirstChecklistBtn.addEventListener('click', () => {
        resetForm();
        updateFormButtons();
        showScreen('checklistForm');
    });
    
    // Modal events
    const closeViewerModal = $('#closeViewerModal');
    const closeViewerModalBtn = $('#closeViewerModalBtn');
    const downloadPDFBtn = $('#downloadPDFBtn');
    
    if (closeViewerModal) closeViewerModal.addEventListener('click', () => closeModal('checklistViewerModal'));
    if (closeViewerModalBtn) closeViewerModalBtn.addEventListener('click', () => closeModal('checklistViewerModal'));
    if (downloadPDFBtn) downloadPDFBtn.addEventListener('click', () => {
        if (currentChecklist) {
            downloadPDF(currentChecklist.id);
        }
    });
    
    // Email modal events
    const closeEmailModal = $('#closeEmailModal');
    const cancelEmailBtn = $('#cancelEmailBtn');
    const sendEmailBtn = $('#sendEmailBtn');
    const emailInput = $('#emailInput');
    
    if (closeEmailModal) closeEmailModal.addEventListener('click', () => closeModal('emailInputModal'));
    if (cancelEmailBtn) cancelEmailBtn.addEventListener('click', () => closeModal('emailInputModal'));
    if (emailInput) {
        emailInput.addEventListener('input', updateEmailValidation);
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !sendEmailBtn.disabled) {
                sendEmailBtn.click();
            }
        });
    }
    if (sendEmailBtn) sendEmailBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        if (currentChecklist && validateEmail(email)) {
            try {
                await downloadPDF(currentChecklist.id, email);
                closeModal('emailInputModal');
                emailInput.value = '';
                updateEmailValidation();
            } catch (error) {
                console.error('Error sending email:', error);
                showToast('Error al enviar el correo', 'error');
            }
        }
    });
    
    // Settings events
    const saveSettingsBtn = $('#saveSettingsBtn');
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsFromUI);
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// Global functions for onclick handlers
window.deleteChecklist = deleteChecklist;
window.viewChecklist = viewChecklist;
window.downloadPDF = downloadPDF;

// Initialize Application
function init() {
    loadChecklists();
    
    if (checkAuth()) {
        updateRoleIndicators();
        updateRoleDescription();
        updateCurrentDate();
        updateMenuButtons();
        showScreen('mainMenu');
    } else {
        showScreen('login');
    }
    
    initEventListeners();
    
    // Initialize EmailJS
    initializeEmailJS();
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);