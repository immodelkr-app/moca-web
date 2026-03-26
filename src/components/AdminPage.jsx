import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { GRADE_INFO, GRADE_EMOJI, logoutUser } from '../services/userService';
import { fetchPartners, fetchContracts, approveContract, rejectContract, deleteContract } from '../services/adminService';
import { fetchLatestAnnouncement } from '../services/chatService';
import { postMessage, fetchMessagesList, deleteMessage, updateMessage } from '../services/messageService';
import { sendBulkMessage, sendAlimtalk, sendFriendtalk } from '../services/aligoService';
import AdminPartners from './AdminPartners';
import AdminShop from './AdminShop';
import AdminPopups from './AdminPopups';
import AdminContractViewerModal from './AdminContractViewerModal';
import { fetchAllCertPostsForAdmin, setHotStatus, setMarketingPick, deleteCertPost } from '../services/certificationService';
import { fetchAllFeaturedVideosForAdmin, addFeaturedVideo, updateFeaturedVideo, deleteFeaturedVideo } from '../services/mocaTVService';
import { fetchAllCurrentPhotos, updatePhotoStatus, deleteCurrentPhoto } from '../services/currentPhotosService';
import * as XLSX from 'xlsx';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'immodel2024'; // 관리자 비밀번호 (.env에 VITE_ADMIN_PASSWORD 설정 권장)

const AdminPage = () => {
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [users, setUsers] = useState([]);
    const [pageViews, setPageViews] = useState([]);
    const [partners, setPartners] = useState([]);
    const [partnerVisits, setPartnerVisits] = useState([]); // Add state for partner visits
    const [tourDiaries, setTourDiaries] = useState([]);
    // 인증샷 관리
    const [certPosts, setCertPosts] = useState([]);
    const [certFilter, setCertFilter] = useState('all'); // 'all' | 'pick'
    const [certLoading, setCertLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [isContractViewerOpen, setIsContractViewerOpen] = useState(false);

    // Lounge Announcement State
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementImage, setAnnouncementImage] = useState(null);
    const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [castingStats, setCastingStats] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loungeView, setLoungeView] = useState('list'); // 'list' | 'write' | 'edit'
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editLinkUrl, setEditLinkUrl] = useState('');
    const [editImage, setEditImage] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // 알리고 메시지 발송 State
    const [msgTarget, setMsgTarget] = useState('ALL');
    const [msgContent, setMsgContent] = useState('');
    const [msgType, setMsgType] = useState('kakao'); // 'kakao' (알림톡/친구톡), 'sms' (문자)
    const [isSendingMsg, setIsSendingMsg] = useState(false);

    // 현재모습 사진 관리 State
    const [currentPhotos, setCurrentPhotos] = useState([]);
    const [currentPhotosLoading, setCurrentPhotosLoading] = useState(false);
    const [currentPhotosFilter, setCurrentPhotosFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'needs_more'
    const [currentPhotosSearch, setCurrentPhotosSearch] = useState('');

    // 모카TV 관리 State
    const [mocaTVVideos, setMocaTVVideos] = useState([]);
    const [mocaTVLoading, setMocaTVLoading] = useState(false);
    const [mocaTVForm, setMocaTVForm] = useState({ title: '', url: '', embed_url: '', thumbnail_url: '', platform: 'instagram', category: '전체보기', is_active: true });
    const [mocaTVSaving, setMocaTVSaving] = useState(false);
    const [mocaTVEditId, setMocaTVEditId] = useState(null);

    const handleLogout = () => {
        logoutUser();
        setAuthenticated(false);
        navigate('/');
    };
    const [filterGrade, setFilterGrade] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'stats'
    const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1); // Default to current month, 0 means 'All Year'

    // 관리자 로그인
    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            setAuthenticated(true);
            fetchData();
        } else {
            setPasswordError('비밀번호가 틀렸습니다.');
        }
    };

    // 데이터 불러오기
    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            if (!supabase) {
                setError('Supabase가 설정되지 않았습니다.');
                return;
            }

            // 1. 회원 데이터
            const { data: usersData, error: fetchUsersError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchUsersError) throw fetchUsersError;
            setUsers(usersData || []);

            // 2. 조회수 데이터
            const { data: viewsData, error: fetchViewsError } = await supabase
                .from('page_views')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchViewsError) {
                // page_views 테이블이 없을 가능성이 높으므로 치명적 에러로 처리하지 않음
                console.warn('page_views 테이블을 찾을 수 없습니다.');
                setPageViews([]);
            } else {
                setPageViews(viewsData || []);
            }

            // 3. 파트너 데이터
            const pRes = await fetchPartners();
            setPartners(pRes.data);

            // 4. 파트너 제휴사 방문 내역 데이터
            const { data: partnerVisitsData, error: partnerVisitsError } = await supabase
                .from('partner_visits')
                .select('*')
                .order('visited_at', { ascending: false });
            if (!partnerVisitsError) {
                setPartnerVisits(partnerVisitsData || []);
            }

            // 5. 전속계약서 목록
            const { data: contractsData } = await fetchContracts();
            if (contractsData) setContracts(contractsData);

            // 6. 투어 일지 (총방문) 데이터
            const { data: diariesData, error: diariesError } = await supabase
                .from('tour_diaries')
                .select('*')
                .order('timestamp', { ascending: false });
            if (!diariesError) {
                setTourDiaries(diariesData || []);
            }

            // 7. 프로필 발송 통계
            const { data: castingData } = await supabase
                .from('casting_sends')
                .select('agency_name');
            if (castingData) {
                const counts = {};
                castingData.forEach(({ agency_name }) => {
                    counts[agency_name] = (counts[agency_name] || 0) + 1;
                });
                const sorted = Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                setCastingStats(sorted);
            }

        } catch (err) {
            setError('데이터를 불러오지 못했습니다: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // 등급 변경
    const handleGradeChange = async (userId, newGrade, months = null) => {
        setUpdatingId(userId);
        setSuccessMsg('');
        try {
            const updates = { grade: newGrade };
            let expiresAt = null;

            if (newGrade === 'GOLD' && months) {
                const date = new Date();
                date.setMonth(date.getMonth() + months);
                expiresAt = date.toISOString();
                updates.grade_expires_at = expiresAt;
            } else if (newGrade === 'SILVER') {
                updates.grade_expires_at = null; // 실버로 강등 시 만료일 초기화
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId);

            if (updateError) throw updateError;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
            setSuccessMsg('등급이 변경되었습니다!');

            // 👉 등급 변경 알림톡 자동 발송 처리
            const userInfo = users.find(u => u.id === userId);
            if (userInfo && userInfo.phone) {
                const expiresStr = expiresAt ? new Date(expiresAt).toLocaleDateString('ko-KR') : '무제한';
                const todayStr = new Date().toLocaleDateString('ko-KR');
                const userName = userInfo.name || userInfo.nickname || '회원';

                // 알리고에 승인된 내용과 토씨 하나 틀리지 않게 작성 (변수 치환)
                let displayGrade = newGrade;
                if (newGrade === 'GOLD' && months) {
                    displayGrade = `GOLD (${months}개월)`;
                } else if (newGrade === 'VIP') {
                    displayGrade = '전속모델';
                }
                const templateText = `안녕하세요 ${userName}님,\n모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n${userName}님의 모카(MOCA)멤버 등급이 아래와 같이 변경되어 안내해 드립니다.\n\n■ 변경 등급: ${displayGrade}\n■ 적용 일자: ${todayStr}\n■ 멤버십 만료일: ${expiresStr}\n\n새로운 멤버십 단계로 상향되심을 축하드립니다!\n업그레이드된 등급으로 새롭게 제공되는 스페셜 혜택들은 아임모카(IM MOCA)에서 상세히 확인하실 수 있습니다.`;

                sendAlimtalk('KA01TP26030909163775811k3Q5BZRBk', [{
                    phone: userInfo.phone,
                    name: userName,
                    message: templateText,
                    variables: {
                        "이름": userName,
                        "변경등급": displayGrade,
                        "적용일자": todayStr,
                        "만료일자": expiresStr
                    },
                    button: {
                        "button": [
                            {
                                "name": "멤버십 혜택 보러가기",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr/home/membership",
                                "linkP": "https://immoca.kr/home/membership"
                            }
                        ]
                    }
                }]).then(res => console.log('알림톡 발송성공', res))
                    .catch(err => console.error('알림톡 발송 에러:', err));
            }

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('등급 변경 실패: ' + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    // 알리고 단체 메시지 발송
    const handleSendBulkMessage = async (e) => {
        e.preventDefault();

        let targetUsers = msgTarget === 'ALL' ? users : users.filter(u => {
            let grade = u.grade || 'SILVER';
            if (grade === 'BASIC') grade = 'SILVER';
            return grade === msgTarget;
        });

        // 유효한 전화번호 추출 (하이픈 제거 및 빈 값 제외)
        const validPhones = targetUsers
            .map(u => u.phone ? u.phone.replace(/-/g, '').trim() : '')
            .filter(p => p.length >= 10);

        if (validPhones.length === 0) {
            setError('발송 가능한 구체적인 연락처가 없습니다.');
            return;
        }

        if (!msgContent.trim()) {
            setError('전송할 메시지 내용을 입력해주세요.');
            return;
        }

        if (!window.confirm(`총 ${validPhones.length}명의 회원에게 메시지를 발송하시겠습니까?`)) {
            return;
        }

        setIsSendingMsg(true);
        setError('');
        try {
            let result;
            if (msgType === 'friendtalk') {
                const receivers = targetUsers
                    .filter(u => u.phone && u.phone.length >= 10)
                    .map(u => ({
                        phone: u.phone.replace(/-/g, ''),
                        content: msgContent.trim(),
                        buttons: []
                    }));
                result = await sendFriendtalk(receivers);
            } else {
                result = await sendBulkMessage(validPhones, msgContent.trim(), msgType);
            }
            if (result && result.success) {
                setSuccessMsg(`성공적으로 발송 처리가 완료되었습니다. (${result.message})`);
                setMsgContent('');
            } else {
                throw new Error(result?.error || '발송 실패');
            }
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setError('메시지 발송 실패: ' + err.message);
        } finally {
            setIsSendingMsg(false);
        }
    };

    // 공지 목록 로드
    const loadAnnouncements = async () => {
        const data = await fetchMessagesList();
        setAnnouncements(data || []);
    };

    // 공지 수정 시작
    const handleEditStart = (a) => {
        setEditingAnnouncement(a);
        setEditTitle(a.title);
        setEditContent(a.content || '');
        setEditLinkUrl(a.link_url || '');
        setEditImage(null);
        setLoungeView('edit');
    };

    // 공지 수정 저장
    const handleUpdateAnnouncement = async (e) => {
        e.preventDefault();
        if (!editTitle.trim() || !editContent.trim()) return;
        setIsUpdating(true);
        setError('');
        try {
            await updateMessage(editingAnnouncement.id, editTitle.trim(), editContent.trim(), editLinkUrl.trim() || null, editImage || null);
            setSuccessMsg('✅ 공지가 수정되었습니다.');
            await loadAnnouncements();
            setLoungeView('list');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('수정 실패: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setIsUpdating(false);
        }
    };

    // 공지 삭제
    const handleDeleteAnnouncement = async (id, title) => {
        if (!window.confirm(`"${title}" 공지를 삭제하시겠습니까?`)) return;
        try {
            await deleteMessage(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            setSuccessMsg('✅ 공지가 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('삭제 실패: ' + (err.message || '알 수 없는 오류'));
        }
    };

    // 공지사항 등록
    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementTitle.trim() || !announcementContent.trim()) {
            setError('제목과 내용을 모두 입력해주세요.');
            return;
        }

        setIsPosting(true);
        setError('');
        try {
            await postMessage(
                announcementTitle.trim(),
                announcementContent.trim(),
                announcementImage || null,
                announcementLinkUrl.trim() || null
            );
            setSuccessMsg('✅ 게시판에 성공적으로 등록되었습니다!');
            setAnnouncementTitle('');
            setAnnouncementContent('');
            setAnnouncementImage(null);
            setAnnouncementLinkUrl('');
            await loadAnnouncements();
            setLoungeView('list');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setError('등록 실패: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setIsPosting(false);
        }
    };

    // 회원 강퇴 (삭제)
    const handleDeleteUser = async (userId, userNickname) => {
        if (!window.confirm(`정말 '${userNickname}' 회원을 강퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        setUpdatingId(userId);
        setSuccessMsg('');
        try {
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (deleteError) throw deleteError;
            setUsers(prev => prev.filter(u => u.id !== userId));
            setSuccessMsg(`'${userNickname}' 회원이 강퇴되었습니다.`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('회원 강퇴 실패: ' + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const grades = ['SILVER', 'GOLD', 'VIP'];

    // 필터링된 유저
    const filteredUsers = users.map(u => {
        // 호환성을 위해 옛 등급 수정
        let currentGrade = u.grade || 'SILVER';
        if (currentGrade === 'BASIC') currentGrade = 'SILVER';
        return { ...u, grade: currentGrade };
    }).filter(u => {
        const matchGrade = filterGrade === 'ALL' || u.grade === filterGrade;
        const matchSearch = !searchQuery ||
            u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.name?.includes(searchQuery) ||
            u.phone?.includes(searchQuery);
        return matchGrade && matchSearch;
    });

    // 등급별 통계
    const gradeStats = grades.reduce((acc, g) => {
        acc[g] = filteredUsers.filter(u => u.grade === g).length;
        return acc;
    }, {});

    // 조회수 통계 계산
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats1Day = pageViews.filter(v => new Date(v.created_at) > oneDayAgo).length;
    const stats7Days = pageViews.filter(v => new Date(v.created_at) > sevenDaysAgo).length;
    const stats30Days = pageViews.filter(v => new Date(v.created_at) > thirtyDaysAgo).length;

    // 인기 페이지 랭킹 계산 (최근 30일 기준)
    const recent30DaysViews = pageViews.filter(v => new Date(v.created_at) > thirtyDaysAgo);
    const pathCounts = recent30DaysViews.reduce((acc, v) => {
        // 라우트 이름 매핑
        let displayName = v.path;
        if (v.path === '/') displayName = '랜딩 페이지 (/)';
        else if (v.path === '/app') displayName = '홈 보드 (/app)';
        else if (v.path === '/map' || v.path === '/app/map') displayName = '지도 보기 (/map)';
        else if (v.path === '/agencies') displayName = '에이전시 목록 (/agencies)';
        else if (v.path === '/admin') displayName = '어드민 관리자 (/admin)';

        acc[displayName] = (acc[displayName] || 0) + 1;
        return acc;
    }, {});

    const popularPages = Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    // ==========================================
    // 월별/올해 방문(투어일지 + 제휴사방문) 데이터 계산
    // ==========================================
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 1. 선택된 월별 (혹은 올해 전체) 방문 Top 10 멤버
    const thisMonthDiaries = tourDiaries.filter(d => {
        const dDate = new Date(d.date || d.timestamp || d.created_at);
        if (dDate.getFullYear() !== currentYear) return false;
        return statsMonth === 0 ? true : (dDate.getMonth() + 1) === statsMonth;
    });

    // 파트너(제휴업체) 방문 내역 포함
    const thisMonthPartnerVisits = partnerVisits.filter(pv => {
        const dDate = new Date(pv.visited_at);
        if (dDate.getFullYear() !== currentYear) return false;
        return statsMonth === 0 ? true : (dDate.getMonth() + 1) === statsMonth;
    });

    const monthlyUserCount = {};
    thisMonthDiaries.forEach(d => {
        const nick = d.nickname || 'guest';
        if (nick !== 'guest') monthlyUserCount[nick] = (monthlyUserCount[nick] || 0) + 1;
    });
    thisMonthPartnerVisits.forEach(pv => {
        const nick = pv.user_nickname || 'guest';
        if (nick !== 'guest') monthlyUserCount[nick] = (monthlyUserCount[nick] || 0) + 1;
    });

    const top10Users = Object.entries(monthlyUserCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([nick, count]) => {
            const uInfo = users.find(u => u.nickname === nick) || {};
            return { nickname: nick, name: uInfo.name || '-', phone: uInfo.phone || '-', count };
        });

    // 2. 올해 방문처 Top 5 (투어 모집처/제휴업체 둘다)
    const thisYearDiaries = tourDiaries.filter(d => {
        const dDate = new Date(d.date || d.timestamp || d.created_at);
        return dDate.getFullYear() === currentYear;
    });
    const thisYearPartnerVisits = partnerVisits.filter(pv => {
        const dDate = new Date(pv.visited_at);
        return dDate.getFullYear() === currentYear;
    });

    const placeCount = {};
    thisYearDiaries.forEach(d => {
        const agency = d.agency_name || '알 수 없음';
        placeCount[agency] = (placeCount[agency] || 0) + 1;
    });
    thisYearPartnerVisits.forEach(pv => {
        // Find partner name
        const p = partners.find(p => p.id === pv.partner_id);
        const pName = p ? p.name : '알 수 없음';
        placeCount[pName] = (placeCount[pName] || 0) + 1;
    });

    const top5Places = Object.entries(placeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // 엑셀 다운로드 (xlsx)
    const handleExportExcel = () => {
        if (filteredUsers.length === 0) {
            alert('다운로드할 회원 데이터가 없습니다.');
            return;
        }

        const excelData = filteredUsers.map(u => ({
            '가입일': new Date(u.created_at).toLocaleDateString('ko-KR'),
            '닉네임': u.nickname || '',
            '이름': u.name || '',
            '연락처': u.phone || '',
            '주소': u.address || '',
            '등급': u.grade || 'SILVER',
            '가입경로': (u.referral_source || []).join(', ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.sheet_add_aoa(worksheet, [['가입일', '닉네임', '이름', '연락처', '주소', '등급', '가입경로']], { origin: 'A1' });

        // 열 너비 조정
        const wscols = [
            { wch: 12 }, // 가입일
            { wch: 15 }, // 닉네임
            { wch: 10 }, // 이름
            { wch: 15 }, // 연락처
            { wch: 40 }, // 주소
            { wch: 10 }, // 등급
            { wch: 15 }  // 가입경로
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '회원목록');

        XLSX.writeFile(workbook, `아임모델_회원목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // 제휴사 방문 내역 엑셀 다운로드
    const handleExportPartnerVisitsExcel = () => {
        if (partnerVisits.length === 0) {
            alert('다운로드할 제휴사 방문 내역이 없습니다.');
            return;
        }

        const excelData = partnerVisits.map(pv => {
            const partnerInfo = partners.find(p => p.id === pv.partner_id);
            return {
                '방문일시': new Date(pv.visited_at).toLocaleString('ko-KR'),
                '사용자 닉네임': pv.user_nickname || '알수없음',
                '제휴업체명': partnerInfo ? partnerInfo.name : '알수없음(삭제됨)',
                '적용 혜택': partnerInfo ? partnerInfo.discount_text : '',
                '카테고리': partnerInfo ? (partnerInfo.category === 'hair_makeup' ? '헤어/메이크업' : partnerInfo.category === 'studio' ? '스튜디오' : partnerInfo.category === 'skincare' ? '피부관리' : '카페') : ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const wscols = [
            { wch: 25 }, // 방문일시
            { wch: 15 }, // 사용자 닉네임
            { wch: 20 }, // 제휴업체명
            { wch: 30 }, // 적용 혜택
            { wch: 15 }, // 카테고리
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '제휴방문내역');

        XLSX.writeFile(workbook, `아임모델_제휴방문내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };


    // 인증 전 - 비밀번호 입력 화면
    if (!authenticated) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
                <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-[#6C63FF]/20 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-[#818CF8] text-[32px]">admin_panel_settings</span>
                        </div>
                        <h1 className="text-2xl font-black text-white">관리자 페이지</h1>
                        <p className="text-white/40 text-sm mt-1">아임모델 어드민</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors"
                            placeholder="관리자 비밀번호"
                            autoFocus
                        />
                        {passwordError && (
                            <p className="text-red-400 text-sm text-center">{passwordError}</p>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black py-3 rounded-xl transition-all hover:opacity-90"
                        >
                            로그인
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full text-white/30 hover:text-white text-sm transition-colors py-2"
                        >
                            ← 랜딩으로 돌아가기
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 인증 후 - 어드민 대시보드
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#818CF8]">admin_panel_settings</span>
                        <h1 className="text-lg font-black text-white">아임모델 어드민</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {successMsg && (
                            <span className="text-green-400 text-sm font-bold animate-pulse">{successMsg}</span>
                        )}
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            새로고침
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1 text-white/40 hover:text-white text-sm transition-colors mr-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">logout</span>
                            로그아웃
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="text-white/40 hover:text-white text-sm transition-colors"
                        >
                            ← 나가기
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* 탭 네비게이션 */}
                <div className="flex gap-4 mb-8 border-b border-white/10 overflow-x-auto hide-scrollbar whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'users' ? 'border-[#6C63FF] text-[#818CF8]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        회원 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'stats' ? 'border-[#6C63FF] text-[#818CF8]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        조회수 통계
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'partners' ? 'border-[#10b981] text-[#34d399]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        제휴사 관리
                    </button>
                    <button
                        onClick={() => { setActiveTab('lounge'); setLoungeView('list'); loadAnnouncements(); }}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'lounge' ? 'border-[#C4B5FD] text-[#C4B5FD]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        아임모카 공지
                    </button>
                    <button
                        onClick={() => setActiveTab('message')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'message' ? 'border-[#FBBF24] text-[#FBBF24]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        메시지 발송
                    </button>
                    <button
                        onClick={() => setActiveTab('shop')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'shop' ? 'border-orange-400 text-orange-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        🔥 모카 에디트 관리
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('certifications');
                            setCertLoading(true);
                            const data = await fetchAllCertPostsForAdmin(false);
                            setCertPosts(data);
                            setCertLoading(false);
                        }}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'certifications' ? 'border-pink-400 text-pink-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        📸 인증샷 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('popups')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'popups' ? 'border-[#6C63FF] text-[#818CF8]' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        🎯 팝업 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'contracts' ? 'border-green-400 text-green-300' : 'border-transparent text-white/40 hover:text-white'
                            }`}
                    >
                        📝 전속계약 관리
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('mocatv');
                            setMocaTVLoading(true);
                            const data = await fetchAllFeaturedVideosForAdmin();
                            setMocaTVVideos(data);
                            setMocaTVLoading(false);
                        }}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'mocatv' ? 'border-red-400 text-red-300' : 'border-transparent text-white/40 hover:text-white'}`}
                    >
                        📺 모카TV 관리
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('currentphotos');
                            setCurrentPhotosLoading(true);
                            const data = await fetchAllCurrentPhotos();
                            setCurrentPhotos(data);
                            setCurrentPhotosLoading(false);
                        }}
                        className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${activeTab === 'currentphotos' ? 'border-emerald-400 text-emerald-300' : 'border-transparent text-white/40 hover:text-white'}`}
                    >
                        📸 현재모습 사진
                    </button>
                </div>

                {activeTab === 'stats' && (
                    <div className="animate-fadeIn">
                        {/* 1일/1주/1달 통계 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: '오늘 방문 (24h)', value: stats1Day, icon: 'today', color: 'text-blue-400' },
                                { label: '주간 방문 (7d)', value: stats7Days, icon: 'date_range', color: 'text-purple-400' },
                                { label: '월간 방문 (30d)', value: stats30Days, icon: 'calendar_month', color: 'text-pink-400' }
                            ].map((stat, i) => (
                                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                                        </div>
                                        <h3 className="text-white/60 text-sm font-bold tracking-widest">{stat.label}</h3>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <p className="text-4xl font-black text-white">{stat.value.toLocaleString()}</p>
                                        <p className="text-white/40 text-sm mb-1 pb-0.5">조회</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 프로필 발송 통계 */}
                        <div className="rounded-2xl border border-white/10 bg-[#1a1a24] p-6 mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[#C4B5FD]">send</span>
                                프로필 발송 많이 받은 에이전시 Top 10
                            </h3>
                            <p className="text-white/40 text-[11px] mb-4">전체 기간 누적 기준 · casting_sends 테이블</p>
                            {castingStats.length === 0 ? (
                                <p className="text-white/40 text-sm py-4">아직 발송 데이터가 없습니다.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {castingStats.map(([agency, count], index) => {
                                        const maxCount = castingStats[0][1];
                                        const barWidth = Math.round((count / maxCount) * 100);
                                        return (
                                            <div key={agency} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-white/10 text-white/40'
                                                }`}>{index + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[13px] font-bold text-white/90 truncate">{agency}</span>
                                                        <span className="text-[13px] font-black text-[#C4B5FD] ml-2 shrink-0">{count}<span className="text-white/30 text-[10px] font-normal ml-0.5">건</span></span>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-[#C4B5FD] to-[#907FF8] rounded-full" style={{ width: `${barWidth}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 랭킹 3종 컨테이너 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* 월별 멤버 방문 Top 10 */}
                            <div className="rounded-2xl border border-white/10 bg-[#1a1a24] p-6 lg:col-span-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-400">group</span>
                                        {statsMonth === 0 ? '올해 총 우수 멤버 Top 10' : `${statsMonth}월 우수 멤버 Top 10`}
                                    </h3>
                                    <select
                                        value={statsMonth}
                                        onChange={(e) => setStatsMonth(Number(e.target.value))}
                                        className="bg-[#0a0a0f] border border-white/10 text-white text-xs rounded-lg px-2 py-1 outline-none focus:border-[#6C63FF]"
                                    >
                                        <option value={0}>올해 전체</option>
                                        {[...Array(12).keys()].map(m => (
                                            <option key={m + 1} value={m + 1}>{m + 1}월</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-white/40 text-[11px] mb-4">제휴처 및 에이전시 방문 기록 합산</p>
                                {top10Users.length === 0 ? (
                                    <p className="text-white/40 text-sm py-4">아직 방문 데이터가 없습니다.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {top10Users.map((user, index) => (
                                            <div key={user.nickname} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-white/10 text-white/40'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-sm font-bold text-white leading-none">{user.name}</span>
                                                            <span className="text-[11px] text-white/50 leading-none">({user.nickname})</span>
                                                        </div>
                                                        <span className="text-[10px] text-white/30 tracking-tight">{user.phone}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-black text-white/90">
                                                    {user.count.toLocaleString()} <span className="text-white/30 text-[10px] font-normal">회</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 멤버들 최다 방문처 Top 5 */}
                            <div className="rounded-2xl border border-white/10 bg-[#1a1a24] p-6 lg:col-span-1">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-pink-400">storefront</span>
                                    올해의 최다 방문처 Top 5
                                </h3>
                                <p className="text-white/40 text-[11px] mb-4">멤버들이 투어/제휴로 가장 많이 찾은 곳</p>
                                {top5Places.length === 0 ? (
                                    <p className="text-white/40 text-sm py-4">아직 방문 데이터가 없습니다.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {top5Places.map(([place, count], index) => (
                                            <div key={place} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-pink-500/20 text-pink-400' :
                                                        index === 1 ? 'bg-purple-500/20 text-purple-300' :
                                                            index === 2 ? 'bg-indigo-500/20 text-indigo-400' :
                                                                'bg-white/10 text-white/40'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-[13px] font-bold text-white/80 line-clamp-1">{place}</span>
                                                </div>
                                                <div className="text-[13px] font-black text-white">
                                                    {count.toLocaleString()} <span className="text-white/30 text-[10px] font-normal">건</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 인기 방문 페이지 Top 5 */}
                            <div className="rounded-2xl border border-white/10 bg-[#1a1a24] p-6 lg:col-span-1">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-[#818CF8]">local_fire_department</span>
                                    인기 방문 앱 페이지 Top 5
                                </h3>
                                <p className="text-white/40 text-[11px] mb-4">최근 30일 접속 통계 기준</p>
                                {popularPages.length === 0 ? (
                                    <p className="text-white/40 text-sm py-4">아직 접속 통계가 없습니다.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {popularPages.map(([path, count], index) => (
                                            <div key={path} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-white/10 text-white/40'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-[13px] font-medium text-white/70 line-clamp-1">{path}</span>
                                                </div>
                                                <div className="text-[13px] font-black text-white text-right">
                                                    {count.toLocaleString()}<span className="text-white/30 text-[10px] ml-1">회</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="animate-fadeIn">
                        {/* 통계 카드 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                            {grades.map(grade => {
                                const info = GRADE_INFO[grade];
                                const emoji = GRADE_EMOJI[grade];
                                return (
                                    <div
                                        key={grade}
                                        onClick={() => setFilterGrade(filterGrade === grade ? 'ALL' : grade)}
                                        className={`rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.02] ${filterGrade === grade
                                            ? 'bg-[#6C63FF]/20 border-[#6C63FF]'
                                            : 'bg-white/5 border-white/10 hover:bg-white/8'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl">{emoji}</span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${info.bg} ${info.text}`}>
                                                {info.label}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-black text-white">{gradeStats[grade] || 0}</p>
                                        <p className="text-white/40 text-xs mt-1">명</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 검색 & 필터 */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
                            <div className="relative flex-1 w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/30 text-[18px]">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="닉네임, 이름, 연락처 검색..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                                {['ALL', ...grades].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFilterGrade(g)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${filterGrade === g
                                            ? 'bg-[#6C63FF] border-[#6C63FF] text-white'
                                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                                            }`}
                                    >
                                        {g === 'ALL' ? '전체' : `${GRADE_EMOJI[g]} ${g === 'VIP' ? '전속모델' : g}`}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleExportExcel}
                                className="flex-shrink-0 flex items-center gap-2 bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/50 text-[#34d399] px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-lg w-full sm:w-auto justify-center"
                            >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                엑셀 저장
                            </button>
                        </div>

                        {/* 에러 */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* 로딩 */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-8 h-8 border-2 border-[#6C63FF]/30 border-t-[#6C63FF] rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* 회원 수 */}
                                <p className="text-white/40 text-sm mb-4">
                                    총 <span className="text-white font-bold">{filteredUsers.length}</span>명
                                    {filterGrade !== 'ALL' && ` (${filterGrade} 필터 중)`}
                                </p>

                                {/* 회원 테이블 */}
                                <div className="bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden w-full overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/5 text-white/30 text-xs font-black uppercase tracking-widest bg-white/5">
                                            <div className="col-span-2">닉네임</div>
                                            <div className="col-span-1">이름</div>
                                            <div className="col-span-2">연락처</div>
                                            <div className="col-span-2">주소</div>
                                            <div className="col-span-1">경로</div>
                                            <div className="col-span-2">등급</div>
                                            <div className="col-span-1">가입일</div>
                                            <div className="col-span-1 text-center">관리</div>
                                        </div>

                                        {filteredUsers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-white/20">
                                                <span className="material-symbols-outlined text-[48px] mb-2">group</span>
                                                <p className="text-sm">회원이 없습니다</p>
                                            </div>
                                        ) : (
                                            filteredUsers.map((user, idx) => {
                                                const info = GRADE_INFO[user.grade] || GRADE_INFO.SILVER;
                                                const emoji = GRADE_EMOJI[user.grade] || GRADE_EMOJI.SILVER;
                                                const referralLabels = {
                                                    sns: 'SNS', friend: '지인', youtube: '유튜브', blog: '블로그', other: '기타'
                                                };
                                                return (
                                                    <div
                                                        key={user.id}
                                                        className={`grid grid-cols-12 gap-3 px-5 py-4 items-center transition-colors hover:bg-white/5 ${idx !== filteredUsers.length - 1 ? 'border-b border-white/5' : ''
                                                            }`}
                                                    >
                                                        {/* 닉네임 */}
                                                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                                                            <span className="text-lg flex-shrink-0">{emoji}</span>
                                                            <div className="min-w-0">
                                                                <p className="text-white font-bold text-sm truncate" title={user.nickname}>{user.nickname}</p>
                                                            </div>
                                                        </div>

                                                        {/* 이름 */}
                                                        <div className="col-span-1 text-white/70 text-sm truncate" title={user.name}>{user.name}</div>

                                                        {/* 연락처 및 복사/문자 버튼 */}
                                                        <div className="col-span-2 flex flex-col items-start gap-1 w-full overflow-hidden">
                                                            <div className="text-white/50 text-xs truncate w-full" title={user.phone}>
                                                                {user.phone}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(user.phone);
                                                                        setSuccessMsg('연락처 복사 완료!');
                                                                        setTimeout(() => setSuccessMsg(''), 2000);
                                                                    }}
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-colors text-[10px]"
                                                                    title="번호 복사"
                                                                >
                                                                    <span className="material-symbols-outlined text-[10px]">content_copy</span>
                                                                    복사
                                                                </button>
                                                                <a
                                                                    href={`sms:${user.phone.replace(/-/g, '')}`}
                                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#6C63FF]/20 hover:bg-[#6C63FF]/40 border border-[#6C63FF]/30 text-[#818CF8] hover:text-white transition-colors text-[10px]"
                                                                    title="문자 보내기"
                                                                >
                                                                    <span className="material-symbols-outlined text-[10px]">sms</span>
                                                                    문자
                                                                </a>
                                                            </div>
                                                        </div>

                                                        {/* 주소 */}
                                                        <div className="col-span-2 text-white/60 text-[11px] leading-tight line-clamp-2" title={user.address}>
                                                            {user.address || '-'}
                                                        </div>

                                                        {/* 가입경로 */}
                                                        <div className="col-span-1 flex flex-wrap gap-1">
                                                            {(user.referral_source || []).map(s => (
                                                                <span key={s} className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/5 text-white/40 font-bold whitespace-nowrap">
                                                                    {referralLabels[s] || s}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* 등급 변경 */}
                                                        <div className="col-span-2 flex flex-col gap-1">
                                                            <select
                                                                value={user.grade || 'SILVER'}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    if (val.startsWith('GOLD_')) {
                                                                        const months = parseInt(val.split('_')[1], 10);
                                                                        handleGradeChange(user.id, 'GOLD', months);
                                                                    } else {
                                                                        handleGradeChange(user.id, val);
                                                                    }
                                                                }}
                                                                disabled={updatingId === user.id}
                                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs font-bold focus:outline-none focus:border-[#6C63FF] transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                {grades.map(g => {
                                                                    if (g === 'GOLD') {
                                                                        return (
                                                                            <optgroup key={g} label={`${GRADE_EMOJI[g]} ${g}`} className="bg-[#1a1a24]">
                                                                                <option value="GOLD_1">1개월 골드</option>
                                                                                <option value="GOLD_3">3개월 골드</option>
                                                                                <option value="GOLD_6">6개월 골드</option>
                                                                                <option value="GOLD_12">12개월 골드</option>
                                                                            </optgroup>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <option key={g} value={g} className="bg-[#1a1a24]">
                                                                            {GRADE_EMOJI[g]} {g === 'VIP' ? '전속모델' : g}
                                                                        </option>
                                                                    );
                                                                })}
                                                                {user.grade === 'GOLD' && (
                                                                    <option value="GOLD" className="bg-[#1a1a24] hidden">
                                                                        🌟 GOLD (현재)
                                                                    </option>
                                                                )}
                                                            </select>
                                                            {user.grade === 'GOLD' && user.grade_expires_at && (
                                                                <span className="text-[10px] text-[#A78BFA] whitespace-nowrap">
                                                                    ~ {new Date(user.grade_expires_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })} 만료
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 가입일 */}
                                                        <div className="col-span-1 text-white/30 text-[10px]">
                                                            {new Date(user.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                                        </div>

                                                        {/* 관리 (강퇴 버튼) */}
                                                        <div className="col-span-1 flex justify-center">
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id, user.nickname)}
                                                                disabled={updatingId === user.id}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="강퇴하기"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">person_remove</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'partners' && (
                    <div className="animate-fadeIn relative">
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={handleExportPartnerVisitsExcel}
                                className="flex items-center gap-2 bg-[#6C63FF]/20 hover:bg-[#6C63FF]/30 border border-[#6C63FF]/50 text-[#A78BFA] px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg"
                            >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                방문내역 엑셀
                            </button>
                        </div>
                        <AdminPartners
                            partners={partners}
                            setPartners={setPartners}
                            setSuccessMsg={setSuccessMsg}
                            setError={setError}
                        />
                    </div>
                )}


                {activeTab === 'lounge' && (
                    <div className="animate-fadeIn max-w-2xl mx-auto mt-8">
                        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-8 shadow-2xl">
                            {/* 헤더 + 탭 버튼 */}
                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#C4B5FD] text-3xl">local_police</span>
                                    <div>
                                        <h2 className="text-xl font-black text-white">아임모카 공지</h2>
                                        <p className="text-sm text-white/40 mt-1">공지 등록 및 관리</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setLoungeView('list'); loadAnnouncements(); }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${loungeView === 'list' ? 'bg-[#C4B5FD]/20 text-[#C4B5FD] border border-[#C4B5FD]/30' : 'text-white/40 hover:text-white'}`}
                                    >목록</button>
                                    <button
                                        onClick={() => setLoungeView('write')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${loungeView === 'write' ? 'bg-[#C4B5FD]/20 text-[#C4B5FD] border border-[#C4B5FD]/30' : 'text-white/40 hover:text-white'}`}
                                    >+ 작성</button>
                                </div>
                            </div>

                            {successMsg && (
                                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 font-bold text-sm mb-4">
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                    {successMsg}
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 font-bold text-sm mb-4">
                                    <span className="material-symbols-outlined text-[20px]">error</span>
                                    {error}
                                </div>
                            )}

                            {/* 목록 뷰 */}
                            {loungeView === 'list' && (
                                <div>
                                    {announcements.length === 0 ? (
                                        <div className="text-center py-12 text-white/30">
                                            <span className="material-symbols-outlined text-[48px] mb-2 block">inbox</span>
                                            <p className="text-sm">등록된 공지가 없습니다.</p>
                                            <button onClick={() => setLoungeView('write')} className="mt-4 px-5 py-2 rounded-xl bg-[#C4B5FD]/20 text-[#C4B5FD] text-sm font-bold hover:bg-[#C4B5FD]/30 transition-colors">
                                                첫 공지 작성하기
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {announcements.map(a => (
                                                <div key={a.id} className="flex items-start justify-between gap-3 bg-[#0a0a0f] rounded-xl px-4 py-3 border border-white/5">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{a.title}</p>
                                                        <p className="text-white/30 text-xs mt-0.5">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button
                                                            onClick={() => handleEditStart(a)}
                                                            className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-blue-400 text-[18px]">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-red-400 text-[18px]">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 수정 뷰 */}
                            {loungeView === 'edit' && editingAnnouncement && (
                                <form onSubmit={handleUpdateAnnouncement} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">메세지 제목</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => { setEditTitle(e.target.value); setError(''); }}
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C4B5FD] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">본문 내용</label>
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => { setEditContent(e.target.value); setError(''); }}
                                            rows={8}
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C4B5FD] transition-colors resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">사진 변경 (선택)</label>
                                        {editingAnnouncement.image_url && !editImage && (
                                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 w-32">
                                                <img src={editingAnnouncement.image_url} alt="현재 이미지" className="w-full h-auto object-cover opacity-70" />
                                                <p className="text-[10px] text-white/30 text-center py-1">현재 이미지</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => { if (e.target.files?.[0]) setEditImage(e.target.files[0]); }}
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C4B5FD] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#C4B5FD]/20 file:text-[#C4B5FD] hover:file:bg-[#C4B5FD]/30"
                                        />
                                        {editImage && <p className="text-xs text-green-400 mt-2">새 파일: {editImage.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">연결 링크 (선택)</label>
                                        <input
                                            type="url"
                                            value={editLinkUrl}
                                            onChange={(e) => { setEditLinkUrl(e.target.value); setError(''); }}
                                            placeholder="https://example.com"
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C4B5FD] transition-colors"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLoungeView('list')}
                                            className="flex-1 py-4 rounded-xl border border-white/10 text-white/60 font-bold text-sm hover:bg-white/5 transition-colors"
                                        >취소</button>
                                        <button
                                            type="submit"
                                            disabled={isUpdating || !editTitle.trim() || !editContent.trim()}
                                            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#907FF8] text-black font-black text-sm disabled:opacity-50 flex justify-center items-center gap-2"
                                        >
                                            {isUpdating ? '저장 중...' : (
                                                <>
                                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                                    수정 저장
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* 작성 뷰 */}
                            {loungeView === 'write' && (
                                <form onSubmit={handlePostAnnouncement} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">메세지 제목</label>
                                        <input
                                            type="text"
                                            value={announcementTitle}
                                            onChange={(e) => { setAnnouncementTitle(e.target.value); setError(''); }}
                                            placeholder="예: [안내] 이번주 MOCA 오프라인 모임"
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C4B5FD] transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">사진 첨부 (선택)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setAnnouncementImage(e.target.files[0]);
                                                }
                                            }}
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C4B5FD] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#C4B5FD]/20 file:text-[#C4B5FD] hover:file:bg-[#C4B5FD]/30"
                                        />
                                        {announcementImage && (
                                            <p className="text-xs text-green-400 mt-2">선택된 파일: {announcementImage.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">본문 내용</label>
                                        <textarea
                                            value={announcementContent}
                                            onChange={(e) => { setAnnouncementContent(e.target.value); setError(''); }}
                                            placeholder="어떤 소식을 전하고 싶으신가요?"
                                            rows={8}
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C4B5FD] transition-colors resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-white/70 mb-2">연결 링크 (선택)</label>
                                        <input
                                            type="url"
                                            value={announcementLinkUrl}
                                            onChange={(e) => { setAnnouncementLinkUrl(e.target.value); setError(''); }}
                                            placeholder="https://example.com"
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C4B5FD] transition-colors"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isPosting || !announcementTitle.trim() || !announcementContent.trim()}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C4B5FD] to-[#907FF8] text-black font-black text-[16px] shadow-lg shadow-[#5B21B6]/30 hover:scale-[1.02] hover:shadow-[#5B21B6]/50 transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
                                    >
                                        {isPosting ? '업로드 중...' : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">send</span>
                                                게시판에 등록하기
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'message' && (
                    <div className="animate-fadeIn max-w-2xl mx-auto mt-8">
                        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                <span className="material-symbols-outlined text-[#FBBF24] text-3xl">sms</span>
                                <div>
                                    <h2 className="text-xl font-black text-white">단체 메시지 발송</h2>
                                    <p className="text-sm text-white/40 mt-1">회원들에게 친구톡 · 알림톡 · 문자를 발송합니다.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSendBulkMessage} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-white/70 mb-2">발송 방식</label>
                                    <select
                                        value={msgType}
                                        onChange={(e) => setMsgType(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FBBF24] transition-colors"
                                    >
                                        <option value="friendtalk">친구톡 (마케팅 · 자유형식)</option>
                                        <option value="kakao">알림톡 (정보성 · 템플릿 필요)</option>
                                        <option value="sms">일반 문자 (SMS/LMS)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-white/70 mb-2">수신 대상</label>
                                    <select
                                        value={msgTarget}
                                        onChange={(e) => setMsgTarget(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FBBF24] transition-colors"
                                    >
                                        <option value="ALL">전체 회원</option>
                                        {grades.map(g => (
                                            <option key={g} value={g}>{GRADE_EMOJI[g]} {g === 'VIP' ? '전속모델' : g} 등급 회원</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-white/40 mt-2">
                                        현재 선택된 대상: {
                                            (msgTarget === 'ALL' ? users : users.filter(u => {
                                                let grade = u.grade || 'SILVER';
                                                if (grade === 'BASIC') grade = 'SILVER';
                                                return grade === msgTarget;
                                            })).filter(u => u.phone && u.phone.length >= 10).length
                                        }명 (연락처 유효 기준)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-white/70 mb-2">메시지 내용</label>
                                    <textarea
                                        value={msgContent}
                                        onChange={(e) => { setMsgContent(e.target.value); setError(''); }}
                                        placeholder={msgType === 'friendtalk' ? '자유롭게 내용을 입력하세요. (친구톡은 템플릿 불필요, 채널 친구에게 발송 · 비친구는 SMS 자동 대체)' : msgType === 'kakao' ? '사전에 승인된 알림톡 템플릿 내용과 정확히 일치해야 합니다.' : '발송할 문자 내용을 입력하세요.'}
                                        rows={6}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#FBBF24] transition-colors resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSendingMsg || !msgContent.trim()}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-black font-black text-[16px] shadow-lg shadow-[#F59E0B]/30 hover:scale-[1.02] hover:shadow-[#F59E0B]/50 transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
                                >
                                    {isSendingMsg ? '발송 요청 중...' : (
                                        <>
                                            <span className="material-symbols-outlined text-[20px]">send</span>
                                            실제 메시지 발송하기
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'popups' && (
                    <AdminPopups />
                )}

                {activeTab === 'shop' && (
                    <AdminShop successMsg={successMsg} setSuccessMsg={setSuccessMsg} />
                )}

                {/* ── 📝 전속계약 관리 탭 ── */}
                {activeTab === 'contracts' && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white">📝 전속계약 관리</h2>
                                <p className="text-white/40 text-sm mt-1">전속모델이 서명 제출한 계약서를 검토하고 승인합니다.</p>
                            </div>
                            <div className="text-sm font-bold text-white/40">
                                총 {contracts.length}건 · 대기 {contracts.filter(c => c.status === 'pending').length}건
                            </div>
                        </div>

                        {selectedContract ? (
                            /* 상세 계약서 뷰 */
                            <div className="bg-white rounded-2xl p-6 sm:p-10 text-gray-800 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-black flex items-center gap-3">
                                        계약서 상세 조회
                                        <button 
                                            onClick={() => setIsContractViewerOpen(true)}
                                            className="ml-4 text-xs bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/30 px-3 py-1.5 rounded-lg hover:bg-[#6C63FF]/20 transition-colors"
                                        >
                                            📄 계약서 전문 보기
                                        </button>
                                    </h3>
                                    <button onClick={() => setSelectedContract(null)} className="text-sm text-gray-500 underline">← 목록으로</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                    <div><span className="font-bold text-gray-500">모델명:</span> <span className="font-black text-lg">{selectedContract.member_name}</span></div>
                                    <div><span className="font-bold text-gray-500">연락처:</span> {selectedContract.member_phone}</div>
                                    <div><span className="font-bold text-gray-500">주민등록번호:</span> {selectedContract.member_id_num}</div>
                                    <div><span className="font-bold text-gray-500">주소:</span> {selectedContract.member_address}</div>
                                    <div><span className="font-bold text-gray-500">계약 시작:</span> {selectedContract.start_date}</div>
                                    <div><span className="font-bold text-gray-500">계약 종료:</span> {selectedContract.end_date}</div>
                                    <div><span className="font-bold text-gray-500">월 교육비:</span> {selectedContract.fee}원</div>
                                    <div><span className="font-bold text-gray-500">서명일:</span> {selectedContract.sign_date}</div>
                                    <div><span className="font-bold text-gray-500">제출일시:</span> {new Date(selectedContract.created_at).toLocaleString('ko-KR')}</div>
                                    <div><span className="font-bold text-gray-500">현재 상태:</span> <span className={`font-black ${selectedContract.status === 'approved' ? 'text-green-600' : selectedContract.status === 'rejected' ? 'text-red-500' : 'text-yellow-600'}`}>{selectedContract.status === 'approved' ? '✅ 승인완료' : selectedContract.status === 'rejected' ? '❌ 반려' : '⏳ 검토 대기'}</span></div>
                                </div>
                                {selectedContract.signature_image && (
                                    <div className="mb-6">
                                        <p className="font-bold text-gray-500 mb-2">모델 서명:</p>
                                        <div className="border-2 border-gray-300 rounded-lg p-3 inline-block bg-gray-50">
                                            <img src={selectedContract.signature_image} alt="서명" className="max-h-24" />
                                        </div>
                                    </div>
                                )}
                                {selectedContract.status === 'pending' && (
                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`${selectedContract.member_name}님의 계약을 승인하시겠습니까? 해당 회원의 등급이 즉시 VIP(전속모델)로 승급됩니다.`)) return;
                                                const { error } = await approveContract(selectedContract.id, selectedContract.member_phone);
                                                if (error) { alert('승인 중 오류: ' + error.message); return; }
                                                const { data: updated } = await fetchContracts();
                                                if (updated) setContracts(updated);
                                                setSelectedContract(null);
                                                setSuccessMsg(`✅ ${selectedContract.member_name}님 전속계약이 승인되었으며 VIP로 승급되었습니다!`);
                                                setTimeout(() => setSuccessMsg(''), 4000);
                                            }}
                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">check_circle</span> 최종 승인 (VIP 등급 즉시 적용)
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('이 계약서를 반려하시겠습니까?')) return;
                                                const { error } = await rejectContract(selectedContract.id);
                                                if (error) { alert('반려 중 오류: ' + error.message); return; }
                                                const { data: updated } = await fetchContracts();
                                                if (updated) setContracts(updated);
                                                setSelectedContract(null);
                                                setSuccessMsg('계약서가 반려 처리되었습니다.');
                                                setTimeout(() => setSuccessMsg(''), 3000);
                                            }}
                                            className="px-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black py-4 rounded-xl transition-all"
                                        >
                                            반려
                                        </button>
                                    </div>
                                )}
                                {selectedContract.status === 'rejected' && (
                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('반려된 계약서를 영구적으로 삭제하시겠습니까?')) return;
                                                const { error } = await deleteContract(selectedContract.id);
                                                if (error) { alert('삭제 중 오류: ' + error.message); return; }
                                                const { data: updated } = await fetchContracts();
                                                if (updated) setContracts(updated);
                                                setSelectedContract(null);
                                                setSuccessMsg('반려된 계약서가 영구 삭제되었습니다.');
                                                setTimeout(() => setSuccessMsg(''), 3000);
                                            }}
                                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">delete</span> 반려된 계약서 영구 삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 계약서 목록 테이블 */
                            contracts.length === 0 ? (
                                <div className="text-center py-20 text-white/30">
                                    <span className="material-symbols-outlined text-6xl mb-4 block">contract</span>
                                    <p className="font-bold">제출된 계약서가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {contracts.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedContract(c)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-5 py-4 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                                    c.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                                    c.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-300'
                                                }`}>
                                                    {c.status === 'approved' ? '✅' : c.status === 'rejected' ? '❌' : '⏳'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-base">{c.member_name}</p>
                                                    <p className="text-white/40 text-xs">{c.member_phone} · 계약기간: {c.start_date} ~ {c.end_date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-white/60 text-xs">{new Date(c.created_at).toLocaleDateString('ko-KR')} 제출</p>
                                                    <p className={`text-xs font-black mt-0.5 ${
                                                        c.status === 'approved' ? 'text-green-400' :
                                                        c.status === 'rejected' ? 'text-red-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                        {c.status === 'approved' ? '승인완료' : c.status === 'rejected' ? '반려됨' : '검토 대기 중'}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-white/20 group-hover:text-white/60 transition-colors">chevron_right</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {isContractViewerOpen && selectedContract && (
                            <AdminContractViewerModal
                                contract={selectedContract}
                                onClose={() => setIsContractViewerOpen(false)}
                            />
                        )}
                    </div>
                )}

                {/* ── 📸 인증샷 관리 탭 ── */}
                {activeTab === 'certifications' && (() => {
                    const now = new Date();
                    const thisMonth = now.getMonth();
                    const thisYear = now.getFullYear();

                    // 이달의 Best Top 3 (이번 달 업로드 + 좋아요 순)
                    const thisMonthPosts = certPosts.filter(p => {
                        const d = new Date(p.created_at);
                        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
                    });
                    const top3 = [...thisMonthPosts].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0)).slice(0, 3);

                    // 📊 통계: 최근 6개월 업로드 수
                    const last6Months = Array.from({ length: 6 }, (_, i) => {
                        const d = new Date(thisYear, thisMonth - (5 - i), 1);
                        return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}월` };
                    });
                    const monthlyUploads = last6Months.map(m => ({
                        label: m.label,
                        count: certPosts.filter(p => {
                            const d = new Date(p.created_at);
                            return d.getFullYear() === m.year && d.getMonth() === m.month;
                        }).length,
                    }));
                    const maxUploads = Math.max(...monthlyUploads.map(m => m.count), 1);

                    // 📊 활동 유형 분포
                    const activityTypes = ['에이전시투어', '광고모델수업', 'BIC시즌이벤트'];
                    const activityCounts = activityTypes.map(t => ({
                        label: t,
                        count: certPosts.filter(p => p.activity_type === t).length,
                    }));
                    const totalPosts = certPosts.length || 1;
                    const activityColors = ['bg-purple-400', 'bg-pink-400', 'bg-orange-400'];
                    const activityTextColors = ['text-purple-400', 'text-pink-400', 'text-orange-400'];

                    // 📊 이달의 활발한 회원 Top 5
                    const nickCounts = {};
                    thisMonthPosts.forEach(p => {
                        nickCounts[p.user_nickname] = (nickCounts[p.user_nickname] || 0) + 1;
                    });
                    const top5Active = Object.entries(nickCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                    // Naver Cafe 포스팅 텍스트 생성
                    const buildNaverText = (post) =>
                        `[아임모델 인증샷 🌟]\n\n📸 #${post.tag_label || post.activity_type} #${post.activity_type}\n${post.caption || ''}\n\n✅ 이미지: ${post.image_url}\n\n#아임모델 #모카MOCA #광고모델 #${post.tag_label || '인증샷'}`;

                    return (
                        <div className="animate-fadeIn space-y-8">

                            {/* ── 🏆 이달의 Best Top 3 ── */}
                            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                                    <div>
                                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                                            🏆 이달의 Best 인증샷 Top 3
                                        </h3>
                                        <p className="text-white/40 text-xs mt-0.5">{now.getMonth() + 1}월 좋아요 순 자동 집계</p>
                                    </div>
                                    {top3.length > 0 && (
                                        <button
                                            onClick={async () => {
                                                let sent = 0;
                                                for (const post of top3) {
                                                    const userInfo = users.find(u =>
                                                        u.nickname === post.user_nickname || u.name === post.user_nickname
                                                    );
                                                    if (userInfo?.phone) {
                                                        const userName = userInfo.name || userInfo.nickname;
                                                        const rank = top3.indexOf(post) + 1;
                                                        try {
                                                            await sendAlimtalk('KA01TP260310152849375I1aYgnt2X3T', [{
                                                                phone: userInfo.phone,
                                                                name: userName,
                                                                variables: {
                                                                    "이름": userName,
                                                                    "등수": rank.toString()
                                                                },
                                                                button: {
                                                                    "button": [
                                                                        {
                                                                            "name": "아임모카 바로가기",
                                                                            "linkType": "WL",
                                                                            "linkTypeName": "웹링크",
                                                                            "linkM": "https://immoca.kr",
                                                                            "linkP": "https://immoca.kr"
                                                                        }
                                                                    ]
                                                                }
                                                            }]);
                                                            sent++;
                                                        } catch (e) { console.warn('이달의 베스트 알림톡 발송 에러:', e); }
                                                        
                                                        await setMarketingPick(post.id, true);
                                                        setCertPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_marketing_pick: true } : p));
                                                    }
                                                }
                                                setSuccessMsg(`✅ Top 3 모카베스트 PICK 선정 완료! (알림톡 ${sent}명 발송)`);
                                                setTimeout(() => setSuccessMsg(''), 4000);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm font-black hover:bg-yellow-500/30 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">send</span>
                                            Top 3 전원 모카베스트 PICK + 알림톡 발송
                                        </button>
                                    )}
                                </div>

                                {top3.length === 0 ? (
                                    <p className="text-white/30 text-sm text-center py-6">이번 달 업로드된 인증샷이 없습니다.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {top3.map((post, idx) => {
                                            const medals = ['🥇', '🥈', '🥉'];
                                            const rankColors = [
                                                'border-yellow-500/50 bg-yellow-500/10',
                                                'border-slate-400/40 bg-slate-400/10',
                                                'border-orange-500/40 bg-orange-500/10',
                                            ];
                                            return (
                                                <div key={post.id} className={`border rounded-2xl overflow-hidden ${rankColors[idx]}`}>
                                                    <div className="relative aspect-square">
                                                        <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                                                        <div className="absolute top-2 left-2 text-2xl">{medals[idx]}</div>
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="text-white font-black text-sm">{post.user_nickname}</p>
                                                        <p className="text-white/50 text-xs">❤️ {post.likes_count} · {post.activity_type}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── 인증샷 목록 헤더 + 필터 ── */}
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <h3 className="text-lg font-black text-white">📸 전체 투어스타그램 관리</h3>
                                    <p className="text-white/40 text-sm mt-0.5">HOT 배지 부여 · 모카베스트 PICK 선정 · 카페 포스팅 · 삭제</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCertFilter('all')}
                                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${certFilter === 'all'
                                            ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300'
                                            : 'bg-white/5 border border-white/10 text-white/50'}`}
                                    >전체</button>
                                    <button
                                        onClick={() => setCertFilter('pick')}
                                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${certFilter === 'pick'
                                            ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                                            : 'bg-white/5 border border-white/10 text-white/50'}`}
                                    >👑 모카베스트 PICK만</button>
                                </div>
                            </div>

                            {certLoading ? (
                                <div className="flex justify-center py-12">
                                    <span className="material-symbols-outlined text-white/30 text-[40px] animate-spin">progress_activity</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {certPosts
                                        .filter(p => certFilter === 'pick' ? p.is_marketing_pick : true)
                                        .map(post => (
                                            <div key={post.id} className="bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden">
                                                <div className="relative w-full aspect-square bg-black/30">
                                                    <img src={post.image_url} alt={post.caption || '인증샷'} className="w-full h-full object-cover" loading="lazy" />
                                                    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                                                        {(post.likes_count >= 10 || post.is_hot) && (
                                                            <span className="flex items-center gap-0.5 bg-orange-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2 py-0.5 rounded-full">🔥 HOT</span>
                                                        )}
                                                        {post.is_marketing_pick && (
                                                            <span className="flex items-center gap-0.5 bg-yellow-500/80 backdrop-blur-sm text-black text-[10px] font-black px-2 py-0.5 rounded-full">👑 모카베스트 PICK</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{post.user_nickname}</p>
                                                            <p className="text-white/40 text-[11px]">{post.activity_type} · ❤️ {post.likes_count}</p>
                                                        </div>
                                                        {post.tag_label && <span className="text-[11px] text-[#A78BFA] font-bold">#{post.tag_label}</span>}
                                                    </div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {/* HOT */}
                                                        <button onClick={async () => {
                                                            const newHot = !post.is_hot;
                                                            await setHotStatus(post.id, newHot);
                                                            setCertPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_hot: newHot } : p));
                                                        }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${post.is_hot ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-orange-500/10'}`}>
                                                            🔥 {post.is_hot ? 'HOT 해제' : 'HOT'}
                                                        </button>
                                                        {/* 모카베스트 PICK */}
                                                        <button onClick={async () => {
                                                            const newPick = !post.is_marketing_pick;
                                                            await setMarketingPick(post.id, newPick);
                                                            setCertPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_marketing_pick: newPick } : p));
                                                            if (newPick) {
                                                                const userInfo = users.find(u => u.nickname === post.user_nickname || u.name === post.user_nickname);
                                                                if (userInfo?.phone) {
                                                                    const userName = userInfo.name || userInfo.nickname;
                                                                    sendBulkMessage([userInfo.phone.replace(/-/g, '')], `[모두의 캐스팅 매니저, 아임모카(IM MOCA)] ${userName}님의 사진이 '모카베스트 PICK'으로 선정되었습니다! 🎉\n\n축하드립니다. 예쁜 사진들 더 많이 기대할게요 😊 담당자가 곧 연락드릴 예정입니다.`)
                                                                        .then(() => setSuccessMsg(`✅ ${userName}님에게 모카베스트 PICK 알림톡 발송!`))
                                                                        .catch(err => console.warn(err));
                                                                } else {
                                                                    setSuccessMsg('👑 모카베스트 PICK 선정! (전화번호 없어 알림톡 미발송)');
                                                                }
                                                            }
                                                        }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${post.is_marketing_pick ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-yellow-500/10'}`}>
                                                            👑 {post.is_marketing_pick ? 'PICK 해제' : '모카베스트 PICK'}
                                                        </button>
                                                        {/* 📋 네이버 카페 포스팅 */}
                                                        <button onClick={() => {
                                                            const text = buildNaverText(post);
                                                            navigator.clipboard.writeText(text).then(() => {
                                                                setSuccessMsg('📋 카페 포스팅 텍스트가 복사되었습니다!');
                                                                setTimeout(() => setSuccessMsg(''), 3000);
                                                            });
                                                            window.open('https://cafe.naver.com/ArticleList.nhn?search.clubid=29732750&search.menuid=85&search.boardtype=L', '_blank');
                                                        }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
                                                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                                                            카페 포스팅
                                                        </button>
                                                        {/* 삭제 */}
                                                        <button onClick={async () => {
                                                            if (!window.confirm('이 인증샷을 삭제할까요?')) return;
                                                            await deleteCertPost(post.id);
                                                            setCertPosts(prev => prev.filter(p => p.id !== post.id));
                                                        }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-white/5 border border-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all">
                                                            <span className="material-symbols-outlined text-[13px]">delete</span>삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {certPosts.filter(p => certFilter === 'pick' ? p.is_marketing_pick : true).length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-white/30">
                                            <span className="material-symbols-outlined text-[40px] mb-3">photo_camera</span>
                                            <p>{certFilter === 'pick' ? "'모카베스트 PICK'으로 선정된 기록이 없습니다." : '아직 다녀온 투어스타그램 기록이 없습니다.'}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 📊 인증샷 통계 대시보드 ── */}
                            <div className="border-t border-white/10 pt-8 space-y-6">
                                <h3 className="text-lg font-black text-white">📊 인증샷 통계</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* 월별 업로드 바차트 */}
                                    <div className="lg:col-span-2 bg-[#1a1a24] border border-white/10 rounded-2xl p-5">
                                        <h4 className="text-white font-bold mb-1">최근 6개월 업로드 수</h4>
                                        <p className="text-white/30 text-[11px] mb-5">월별 인증샷 업로드 추이</p>
                                        <div className="flex items-end gap-3 h-32">
                                            {monthlyUploads.map((m, i) => (
                                                <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                                                    <span className="text-white text-[11px] font-black">{m.count > 0 ? m.count : ''}</span>
                                                    <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '96px' }}>
                                                        <div
                                                            className="w-full bg-gradient-to-t from-[#6C63FF] to-[#A78BFA] rounded-t-lg transition-all duration-700"
                                                            style={{ height: `${(m.count / maxUploads) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                                                        />
                                                    </div>
                                                    <span className="text-white/40 text-[10px]">{m.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 활동 유형 분포 */}
                                    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5">
                                        <h4 className="text-white font-bold mb-1">활동 유형 분포</h4>
                                        <p className="text-white/30 text-[11px] mb-5">전체 {certPosts.length}건</p>
                                        <div className="space-y-3">
                                            {activityCounts.map((a, i) => (
                                                <div key={a.label}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className={`font-bold ${activityTextColors[i]}`}>{a.label}</span>
                                                        <span className="text-white/60 font-black">{a.count}건 ({Math.round((a.count / totalPosts) * 100)}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${activityColors[i]} opacity-80 transition-all duration-700`}
                                                            style={{ width: `${(a.count / totalPosts) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 이달의 활발한 회원 Top 5 */}
                                <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5">
                                    <h4 className="text-white font-bold mb-1">이달의 활발한 회원 Top 5</h4>
                                    <p className="text-white/30 text-xs mb-4">{now.getMonth() + 1}월 업로드 수 기준</p>
                                    {top5Active.length === 0 ? (
                                        <p className="text-white/30 text-sm py-3">이번 달 업로드가 없습니다.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                            {top5Active.map(([nick, count], idx) => {
                                                const rankColors = ['text-yellow-400', 'text-slate-300', 'text-orange-400', 'text-white/60', 'text-white/60'];
                                                const rankBg = ['bg-yellow-500/15 border-yellow-500/30', 'bg-slate-500/15 border-slate-500/30', 'bg-orange-500/15 border-orange-500/30', 'bg-white/5 border-white/10', 'bg-white/5 border-white/10'];
                                                return (
                                                    <div key={nick} className={`flex flex-col items-center p-3 rounded-xl border text-center ${rankBg[idx]}`}>
                                                        <span className={`text-lg font-black ${rankColors[idx]}`}>{['🥇', '🥈', '🥉', '4', '5'][idx]}</span>
                                                        <p className="text-white text-sm font-black mt-1 truncate w-full">{nick}</p>
                                                        <p className="text-white/50 text-xs">{count}건</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── 📺 모카TV 관리 탭 ── */}
                {activeTab === 'mocatv' && (
                    <div className="animate-fadeIn space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-white">📺 모카TV 관리</h2>
                            <p className="text-white/40 text-sm mt-1">릴스·틱톡·유튜브 영상 링크를 등록하면 모카TV 피드에 9:16으로 노출됩니다.</p>
                        </div>

                        {/* Supabase 테이블 안내 */}
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-yellow-300 text-sm">
                            <p className="font-black mb-1">📌 Supabase 테이블 생성 필요 (최초 1회)</p>
                            <code className="text-xs text-yellow-200/80 whitespace-pre-wrap block bg-black/30 rounded-lg p-3 mt-2">{`CREATE TABLE moca_featured_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  embed_url TEXT,
  thumbnail_url TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram',
  category TEXT DEFAULT '전체보기',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</code>
                        </div>

                        {/* 등록 / 수정 폼 */}
                        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 space-y-4">
                            <h3 className="text-white font-black">{mocaTVEditId ? '✏️ 영상 수정' : '➕ 새 영상 등록'}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white/50 text-xs font-bold mb-1 block">제목 *</label>
                                    <input
                                        type="text"
                                        value={mocaTVForm.title}
                                        onChange={e => setMocaTVForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="영상 제목"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs font-bold mb-1 block">플랫폼 *</label>
                                    <select
                                        value={mocaTVForm.platform}
                                        onChange={e => setMocaTVForm(f => ({ ...f, platform: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    >
                                        <option value="instagram">Instagram Reels</option>
                                        <option value="tiktok">TikTok</option>
                                        <option value="youtube">YouTube Shorts</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-white/50 text-xs font-bold mb-1 block">원본 URL * (영상 링크)</label>
                                    <input
                                        type="url"
                                        value={mocaTVForm.url}
                                        onChange={e => setMocaTVForm(f => ({ ...f, url: e.target.value }))}
                                        placeholder="https://www.instagram.com/reel/..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-white/50 text-xs font-bold mb-1 block">임베드 URL (인앱 재생용, 없으면 새 탭으로 열림)</label>
                                    <input
                                        type="url"
                                        value={mocaTVForm.embed_url}
                                        onChange={e => setMocaTVForm(f => ({ ...f, embed_url: e.target.value }))}
                                        placeholder="예: https://www.instagram.com/reel/XXXX/embed/"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-white/50 text-xs font-bold mb-1 block">썸네일 URL (없으면 아이콘 표시)</label>
                                    <input
                                        type="url"
                                        value={mocaTVForm.thumbnail_url}
                                        onChange={e => setMocaTVForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs font-bold mb-1 block">카테고리</label>
                                    <select
                                        value={mocaTVForm.category}
                                        onChange={e => setMocaTVForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#6C63FF]/60 transition"
                                    >
                                        {['전체보기', '에이전시투어', '광고프로필', '표정&포즈', '광고Q&A'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-5">
                                    <label className="text-white/50 text-xs font-bold">공개 여부</label>
                                    <button
                                        onClick={() => setMocaTVForm(f => ({ ...f, is_active: !f.is_active }))}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${mocaTVForm.is_active ? 'bg-[#6C63FF]' : 'bg-white/10'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${mocaTVForm.is_active ? 'left-7' : 'left-1'}`} />
                                    </button>
                                    <span className="text-white/60 text-xs">{mocaTVForm.is_active ? '공개' : '비공개'}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    disabled={mocaTVSaving || !mocaTVForm.title || !mocaTVForm.url}
                                    onClick={async () => {
                                        setMocaTVSaving(true);
                                        if (mocaTVEditId) {
                                            await updateFeaturedVideo(mocaTVEditId, mocaTVForm);
                                        } else {
                                            await addFeaturedVideo(mocaTVForm);
                                        }
                                        const data = await fetchAllFeaturedVideosForAdmin();
                                        setMocaTVVideos(data);
                                        setMocaTVForm({ title: '', url: '', embed_url: '', thumbnail_url: '', platform: 'instagram', category: '전체보기', is_active: true });
                                        setMocaTVEditId(null);
                                        setMocaTVSaving(false);
                                    }}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-sm disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-[#6C63FF]/30"
                                >
                                    {mocaTVSaving ? '저장 중...' : mocaTVEditId ? '수정 저장' : '등록하기'}
                                </button>
                                {mocaTVEditId && (
                                    <button
                                        onClick={() => {
                                            setMocaTVEditId(null);
                                            setMocaTVForm({ title: '', url: '', embed_url: '', thumbnail_url: '', platform: 'instagram', category: '전체보기', is_active: true });
                                        }}
                                        className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-bold text-sm hover:bg-white/10 transition-all"
                                    >
                                        취소
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 영상 목록 */}
                        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-white font-black">등록된 영상 ({mocaTVVideos.length}개)</h3>
                                {mocaTVLoading && <div className="w-5 h-5 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />}
                            </div>
                            {mocaTVVideos.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-white/30">
                                    <span className="material-symbols-outlined text-[40px] mb-3">smart_display</span>
                                    <p>등록된 영상이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {mocaTVVideos.map(v => (
                                        <div key={v.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors">
                                            <div className="w-12 h-20 rounded-lg bg-black overflow-hidden flex-shrink-0">
                                                {v.thumbnail_url ? (
                                                    <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white/20 text-[24px]">smart_display</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{v.title}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${v.platform === 'instagram' ? 'bg-pink-500/20 text-pink-300' : v.platform === 'tiktok' ? 'bg-white/10 text-white/60' : 'bg-red-500/20 text-red-300'}`}>
                                                        {v.platform === 'instagram' ? 'Reels' : v.platform === 'tiktok' ? 'TikTok' : 'Shorts'}
                                                    </span>
                                                    <span className="text-white/30 text-[11px]">{v.category}</span>
                                                    <span className={`text-[10px] font-bold ${v.is_active ? 'text-green-400' : 'text-white/30'}`}>{v.is_active ? '공개' : '비공개'}</span>
                                                </div>
                                                <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-[#6C63FF] text-[11px] truncate block mt-0.5 hover:underline">{v.url}</a>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        setMocaTVEditId(v.id);
                                                        setMocaTVForm({ title: v.title, url: v.url, embed_url: v.embed_url || '', thumbnail_url: v.thumbnail_url || '', platform: v.platform, category: v.category || '전체보기', is_active: v.is_active });
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm(`"${v.title}" 영상을 삭제할까요?`)) return;
                                                        await deleteFeaturedVideo(v.id);
                                                        setMocaTVVideos(prev => prev.filter(item => item.id !== v.id));
                                                    }}
                                                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── 현재모습 사진 탭 ── */}
                {activeTab === 'currentphotos' && (() => {
                    const STATUS_LABEL = {
                        pending: { text: '검토중', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30' },
                        approved: { text: '승인', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
                        needs_more: { text: '추가요청', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
                    };

                    // 필터 + 검색 적용
                    const filtered = currentPhotos.filter(p => {
                        const matchStatus = currentPhotosFilter === 'all' || p.status === currentPhotosFilter;
                        const q = currentPhotosSearch.trim().toLowerCase();
                        const matchSearch = !q || (p.user_name || '').toLowerCase().includes(q) || (p.user_nickname || '').toLowerCase().includes(q);
                        return matchStatus && matchSearch;
                    });

                    // 모델별 그룹핑
                    const groups = {};
                    filtered.forEach(p => {
                        const key = p.user_nickname || p.user_id || 'unknown';
                        if (!groups[key]) groups[key] = { name: p.user_name, nickname: p.user_nickname, photos: [] };
                        groups[key].photos.push(p);
                    });

                    return (
                        <div className="animate-fadeIn space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-white">📸 현재모습 사진 관리</h2>
                                <p className="text-white/40 text-sm mt-1">모델이 업로드한 현재모습 사진을 확인하고 상태를 관리합니다.</p>
                            </div>

                            {/* Supabase 테이블 안내 */}
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300 text-sm">
                                <p className="font-black mb-1">📌 Supabase 테이블 생성 필요 (최초 1회)</p>
                                <code className="text-xs text-emerald-200/80 whitespace-pre-wrap block bg-black/30 rounded-lg p-3 mt-2">{`CREATE TABLE model_current_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_nickname TEXT,
  user_name TEXT,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</code>
                            </div>

                            {/* 필터 + 검색 */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <input
                                    type="text"
                                    value={currentPhotosSearch}
                                    onChange={e => setCurrentPhotosSearch(e.target.value)}
                                    placeholder="모델 이름/닉네임 검색"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-emerald-500/60 transition w-48"
                                />
                                {['all', 'pending', 'approved', 'needs_more'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setCurrentPhotosFilter(f)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${currentPhotosFilter === f ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                    >
                                        {{ all: '전체', pending: '검토중', approved: '승인', needs_more: '추가요청' }[f]}
                                    </button>
                                ))}
                                <span className="text-white/30 text-xs ml-auto">총 {filtered.length}장</span>
                            </div>

                            {currentPhotosLoading ? (
                                <div className="text-center py-12 text-white/30">불러오는 중...</div>
                            ) : Object.keys(groups).length === 0 ? (
                                <div className="text-center py-12 text-white/20">
                                    <span className="material-symbols-outlined text-[48px] mb-2 block">collections</span>
                                    <p>업로드된 사진이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Object.entries(groups).map(([key, group]) => (
                                        <div key={key} className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[18px] text-emerald-400">person</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-white">{group.name || group.nickname}</p>
                                                    <p className="text-white/30 text-xs">@{group.nickname} · {group.photos.length}장</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                {group.photos.map(photo => {
                                                    const sl = STATUS_LABEL[photo.status] || STATUS_LABEL.pending;
                                                    return (
                                                        <div key={photo.id} className="relative group">
                                                            <img
                                                                src={photo.photo_url}
                                                                alt="현재모습"
                                                                className="w-full aspect-square object-cover rounded-xl border border-white/10"
                                                            />
                                                            {/* 상태 뱃지 */}
                                                            <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border ${sl.bg} ${sl.color} ${sl.border}`}>
                                                                {sl.text}
                                                            </span>
                                                            {/* 액션 버튼들 */}
                                                            <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-around py-1.5 gap-1 px-1">
                                                                {/* 승인 */}
                                                                <button
                                                                    title="승인"
                                                                    onClick={async () => {
                                                                        await updatePhotoStatus(photo.id, 'approved');
                                                                        setCurrentPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'approved' } : p));
                                                                    }}
                                                                    className="flex-1 py-1 rounded-lg bg-emerald-500/30 text-emerald-300 text-[10px] font-black hover:bg-emerald-500/50 transition"
                                                                >
                                                                    ✓승인
                                                                </button>
                                                                {/* 추가요청 */}
                                                                <button
                                                                    title="추가요청"
                                                                    onClick={async () => {
                                                                        await updatePhotoStatus(photo.id, 'needs_more');
                                                                        setCurrentPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'needs_more' } : p));
                                                                    }}
                                                                    className="flex-1 py-1 rounded-lg bg-red-500/30 text-red-300 text-[10px] font-black hover:bg-red-500/50 transition"
                                                                >
                                                                    +요청
                                                                </button>
                                                                {/* 링크복사 */}
                                                                <button
                                                                    title="링크 복사"
                                                                    onClick={() => navigator.clipboard.writeText(photo.photo_url)}
                                                                    className="w-7 h-7 rounded-lg bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">link</span>
                                                                </button>
                                                                {/* 다운로드 */}
                                                                <a
                                                                    href={photo.photo_url}
                                                                    download
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-7 h-7 rounded-lg bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
                                                                    title="다운로드"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">download</span>
                                                                </a>
                                                                {/* 삭제 */}
                                                                <button
                                                                    title="삭제"
                                                                    onClick={async () => {
                                                                        if (!window.confirm('이 사진을 삭제할까요?')) return;
                                                                        await deleteCurrentPhoto(photo.id, photo.storage_path);
                                                                        setCurrentPhotos(prev => prev.filter(p => p.id !== photo.id));
                                                                    }}
                                                                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default AdminPage;
