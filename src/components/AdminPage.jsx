import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { GRADE_INFO, GRADE_EMOJI, logoutUser } from '../services/userService';
import AdminUpgradeRequests from './AdminUpgradeRequests';
import AdminPopups from './AdminPopups';
import AdminClasses from './AdminClasses';
import AdminHomepage, { FONT_OPTIONS, FONT_SIZE_OPTIONS, GRADIENT_OPTIONS, HIGHLIGHT_STYLE_OPTIONS } from './AdminHomepage';
import AdminContractViewerModal from './AdminContractViewerModal';
import { fetchAllCertPostsForAdmin, setHotStatus, setMarketingPick, deleteCertPost, parseImageUrls } from '../services/certificationService';
import { fetchAllCurrentPhotos, updatePhotoStatus, updatePhotoFeedback, deleteCurrentPhoto, addPhotoFeedbackComment, fetchPhotoFeedbackComments } from '../services/currentPhotosService';
import { fetchAllQnaPostsForAdmin, updateAdminReply, deleteQnaPost, QNA_CATEGORIES, getCategoryInfo } from '../services/qnaService';
import { fetchContracts, approveContract, rejectContract, deleteContract } from '../services/adminService';
import { sendAlimtalk, sendBulkMessage, sendFriendtalk } from '../services/solapiService';
import { fetchPushHistory, sendBroadcastPush, fetchUsersWithoutPushToken, fetchAllUsersWithPhone } from '../services/pushNotificationService';
import { fetchMessagesList, createAnnouncementMessage, updateMessage, deleteMessage } from '../services/messageService';
import { getPointsBalance, getPointsHistory, rewardPoints, deductPoints } from '../lib/imCoreAuth';
import * as XLSX from 'xlsx';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'immodel2024'; // 관리자 비밀번호 (.env에 VITE_ADMIN_PASSWORD 설정 권장)

const AdminPage = () => {
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [users, setUsers] = useState([]);
    const [pageViews, setPageViews] = useState([]);
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
    // 전속모델(VIP)인데 계약서가 없는 인원을 포함한 가공된 계약서 목록
    const allContracts = useMemo(() => {
        const vipUsers = users.filter(u => u.grade === 'VIP');
        const contractPhones = new Set(
            contracts.map(c => c.member_phone?.replace(/-/g, '').trim())
        );

        const missingContracts = vipUsers
            .filter(u => {
                const cleanedPhone = u.phone?.replace(/-/g, '').trim();
                return cleanedPhone && !contractPhones.has(cleanedPhone);
            })
            .map(u => ({
                id: `missing-${u.id}`,
                member_name: u.name || u.nickname,
                member_phone: u.phone,
                member_id_num: '미작성',
                member_address: '미작성',
                start_date: '-',
                end_date: '-',
                fee: '',
                sign_date: '-',
                signature_image: null,
                status: 'no_contract',
                created_at: u.created_at || new Date().toISOString(),
            }));

        return [...contracts, ...missingContracts].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
    }, [contracts, users]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [isContractViewerOpen, setIsContractViewerOpen] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);

    // Lounge Announcement State
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementImage, setAnnouncementImage] = useState(null);
    const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('');
    const [noticeFontFamily, setNoticeFontFamily] = useState('Pretendard');
    const [noticeFontSize, setNoticeFontSize] = useState('md');
    const [noticeHighlightGradient, setNoticeHighlightGradient] = useState('purple');
    const [noticeHighlightStyle, setNoticeHighlightStyle] = useState('gradient');
    const [isPosting, setIsPosting] = useState(false);
    const [castingStats, setCastingStats] = useState([]);
    const [senderStats, setSenderStats] = useState([]); // 프로필 발송 많이 보낸 유저 통계
    const [announcements, setAnnouncements] = useState([]);
    const [loungeView, setLoungeView] = useState('list'); // 'list' | 'write' | 'edit'
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editLinkUrl, setEditLinkUrl] = useState('');
    const [editImage, setEditImage] = useState(null);
    const [editFontFamily, setEditFontFamily] = useState('Pretendard');
    const [editFontSize, setEditFontSize] = useState('md');
    const [editHighlightGradient, setEditHighlightGradient] = useState('purple');
    const [editHighlightStyle, setEditHighlightStyle] = useState('gradient');
    const [removeExistingImage, setRemoveExistingImage] = useState(false);
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

    // 피드백 작성 모달 State
    const [feedbackModal, setFeedbackModal] = useState(null); // null | { photo, user_grade }
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState('needs_more');
    const [feedbackSaving, setFeedbackSaving] = useState(false);

    // 1:1 어드민 채팅 State
    const [adminChatPhoto, setAdminChatPhoto] = useState(null);
    const [adminChatComments, setAdminChatComments] = useState([]);
    const [adminChatLoading, setAdminChatLoading] = useState(false);
    const [adminChatInput, setAdminChatInput] = useState('');
    const [adminChatSending, setAdminChatSending] = useState(false);
    const adminChatBottomRef = useRef(null);

    // Q&A 게시판 관리 State
    const [qnaPosts, setQnaPosts] = useState([]);
    const [qnaLoading, setQnaLoading] = useState(false);
    const [qnaFilter, setQnaFilter] = useState('all'); // 'all' | 'unanswered'
    const [qnaReplyInputs, setQnaReplyInputs] = useState({}); // { [postId]: replyText }
    const [qnaExpanded, setQnaExpanded] = useState({}); // { [postId]: boolean }

    // 투어일지 관리 State
    const [diaryFilterAgency, setDiaryFilterAgency] = useState('ALL');
    const [diarySearch, setDiarySearch] = useState('');
    const [diaryDateFilter, setDiaryDateFilter] = useState('all'); // 'all' | '7d' | '30d'
    const [diaryExpandedId, setDiaryExpandedId] = useState(null); // 펼쳐본 일지 ID

    // Phase 2: 주간 리포트 발송 State
    const [reportWebhookUrl, setReportWebhookUrl] = useState('immodelkr@gmail.com');
    const [reportWebhookType, setReportWebhookType] = useState('email'); // 'email' | 'slack' | 'discord'
    const [reportSending, setReportSending] = useState(false);
    const [reportResult, setReportResult] = useState(null); // { success, message, summary }

    // Phase 3: AI 동향 분석 State
    const [aiSummaryAgency, setAiSummaryAgency] = useState(null); // 분석 중인 에이전시명
    const [aiSummaryResult, setAiSummaryResult] = useState({}); // { [agencyName]: { auditioning, tips, atmosphere, preferred, warnings, overall } }
    const [aiSummaryLoading, setAiSummaryLoading] = useState({}); // { [agencyName]: boolean }

    // 회원별 모카클래스 수강 신청 건수 맵 { [user_id]: count }
    const [userClassAppCounts, setUserClassAppCounts] = useState({});

    // 푸시 발송 내역
    const [pushHistory, setPushHistory] = useState([]);
    const [pushHistoryLoading, setPushHistoryLoading] = useState(false);

    // ── 알림·메시지 센터 state ──
    // 앱 푸시 알림 발송
    const [pushForm, setPushForm] = useState({ title: '', body: '', route: '/agencies' });
    const [isSendingPush, setIsSendingPush] = useState(false);
    const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
    const [pushResult, setPushResult] = useState(null);
    // 앱 설치 독려 메시지
    const DEFAULT_INSTALL_MSG = `[아임모델 모카] 안녕하세요!\n앱을 설치하시면 새 공지·클래스·에이전시 소식을 푸시 알림으로 가장 먼저 받아보실 수 있습니다!\n\n👉 구글 플레이 설치:\nhttps://play.google.com/store/apps/details?id=com.immodel.mocapp\n(구글플레이에서 '모두의 캐스팅' 검색)`;
    const DEFAULT_PERMISSION_MSG = `[아임모델 모카] 안녕하세요!\n앱은 설치하셨으나 푸시 알림 수신이 차단되어 소식을 받지 못하고 계십니다.\n\n👉 알림 켜는 방법:\n1. 모카 앱 열기 > 마이페이지 > 알림 수신 동의 켜기\n2. 스마트폰 설정 > 애플리케이션 > '모두의 캐스팅' > 알림 허용`;
    const [noPushUsers, setNoPushUsers] = useState([]);
    const [noAppUsers, setNoAppUsers] = useState([]);
    const [noPermissionUsers, setNoPermissionUsers] = useState([]);
    const [allPhoneUsers, setAllPhoneUsers] = useState([]);
    const [noPushLoading, setNoPushLoading] = useState(false);
    const [msgForm, setMsgForm] = useState({ type: 'sms', content: DEFAULT_INSTALL_MSG, target: 'noapp' });
    const [isSendingEncourage, setIsSendingEncourage] = useState(false);
    const [msgConfirmOpen, setMsgConfirmOpen] = useState(false);
    const [msgResult, setMsgResult] = useState(null);
    // 알림 센터 서브탭
    const [notifSubTab, setNotifSubTab] = useState('push'); // 'push' | 'encourage' | 'history'

    const handleLogout = () => {
        logoutUser();
        setAuthenticated(false);
        navigate('/');
    };
    const [filterGrade, setFilterGrade] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'stats'
    const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1); // Default to current month, 0 means 'All Year'

    // 탭 변경 시 에러 메시지 초기화
    useEffect(() => {
        setError('');
    }, [activeTab]);

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

            // 2. 조회수 데이터 (최근 30일 데이터만 조회하며 1000개 제한 우회를 위해 페이지네이션 처리)
            let allViews = [];
            let viewPage = 0;
            const viewPageSize = 1000;
            let hasMoreViews = true;
            let fetchViewsError = null;
            const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            while (hasMoreViews) {
                const { data: viewsChunk, error: chunkError } = await supabase
                    .from('page_views')
                    .select('*')
                    .gte('accessed_at', thirtyDaysAgoIso)
                    .order('accessed_at', { ascending: false })
                    .range(viewPage * viewPageSize, (viewPage + 1) * viewPageSize - 1);

                if (chunkError) {
                    fetchViewsError = chunkError;
                    hasMoreViews = false;
                    break;
                }

                if (viewsChunk && viewsChunk.length > 0) {
                    allViews = [...allViews, ...viewsChunk];
                    if (viewsChunk.length < viewPageSize) {
                        hasMoreViews = false;
                    } else {
                        viewPage++;
                    }
                } else {
                    hasMoreViews = false;
                }
            }

            if (fetchViewsError) {
                console.warn('page_views 테이블을 찾을 수 없습니다.');
                setPageViews([]);
            } else {
                setPageViews(allViews);
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

            // 7. 프로필 발송 통계 (받은 곳 / 보낸 사람)
            const { data: castingData } = await supabase
                .from('casting_sends')
                .select('agency_name, user_nickname');
            if (castingData) {
                // 7-1. 많이 받은 에이전시
                const agencyCounts = {};
                // 7-2. 많이 보낸 유저(모델/에이전시)
                const senderCounts = {};

                castingData.forEach(({ agency_name, user_nickname }) => {
                    if (agency_name) agencyCounts[agency_name] = (agencyCounts[agency_name] || 0) + 1;
                    if (user_nickname) senderCounts[user_nickname] = (senderCounts[user_nickname] || 0) + 1;
                });

                const sortedAgencies = Object.entries(agencyCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                setCastingStats(sortedAgencies);

                const sortedSenders = Object.entries(senderCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                setSenderStats(sortedSenders);
            }

            // 8. 회원별 모카클래스 신청 건수 집계
            const { data: classAppsCountData, error: classAppsCountError } = await supabase
                .from('class_applications')
                .select('user_id');
            if (!classAppsCountError && classAppsCountData) {
                const counts = {};
                classAppsCountData.forEach(app => {
                    if (app.user_id) counts[app.user_id] = (counts[app.user_id] || 0) + 1;
                });
                setUserClassAppCounts(counts);
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

            if (newGrade === 'GOLD') {
                if (months) {
                    const date = new Date();
                    date.setMonth(date.getMonth() + months);
                    expiresAt = date.toISOString();
                    updates.grade_expires_at = expiresAt;
                } else {
                    updates.grade_expires_at = null; // 기간 미지정인 경우 만료일 초기화 (조기 강등 방지)
                }
            } else if (newGrade === 'SILVER' || newGrade === 'IMODEL' || newGrade === 'VIP') {
                updates.grade_expires_at = null; // 만료일 없이 수동 부여
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
                let displayGrade = GRADE_INFO[newGrade]?.label || newGrade;
                if (newGrade === 'GOLD' && months) {
                    displayGrade = `GOLD (${months}개월)`;
                }
                const expiresLabel = (newGrade === 'VIP' || newGrade === 'IMODEL') ? displayGrade : 'GOLD 등급';
                const templateText = `안녕하세요 ${userName}님,\n모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n${userName}님의 모카(MOCA) 등급이 아래와 같이 변경되어 안내해 드립니다.\n\n■ 변경 등급: ${displayGrade}\n■ 적용 일자: ${todayStr}\n■ ${expiresLabel} 만료일: ${expiresStr}\n\n새로운 등급으로 상향되심을 축하드립니다!\n업그레이드된 등급으로 새롭게 제공되는 스페셜 혜택들은 아임모카(IM MOCA)에서 상세히 확인하실 수 있습니다.`;


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
                                "name": "등급 혜택 보러가기",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr/upgrade",
                                "linkP": "https://immoca.kr/upgrade"
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
        setEditFontFamily(a.font_family || 'Pretendard');
        setEditFontSize(a.font_size || 'md');
        setEditHighlightGradient(a.highlight_gradient || 'purple');
        setEditHighlightStyle(a.highlight_style || 'gradient');
        setRemoveExistingImage(false);
        setLoungeView('edit');
    };

    // 공지 수정 저장
    const handleUpdateAnnouncement = async (e) => {
        e.preventDefault();
        if (!editTitle.trim() || !editContent.trim()) return;
        setIsUpdating(true);
        setError('');
        try {
            await updateMessage(
                editingAnnouncement.id,
                editTitle.trim(),
                editContent.trim(),
                editLinkUrl.trim() || null,
                editImage || null,
                removeExistingImage,
                {
                    font_family: editFontFamily,
                    font_size: editFontSize,
                    highlight_gradient: editHighlightGradient,
                    highlight_style: editHighlightStyle,
                }
            );
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
            await createAnnouncementMessage(
                announcementTitle.trim(),
                announcementContent.trim(),
                announcementImage || null,
                announcementLinkUrl.trim() || null,
                {
                    font_family: noticeFontFamily,
                    font_size: noticeFontSize,
                    highlight_gradient: noticeHighlightGradient,
                    highlight_style: noticeHighlightStyle,
                }
            );
            setSuccessMsg('✅ 게시판에 성공적으로 등록되었습니다!');
            setAnnouncementTitle('');
            setAnnouncementContent('');
            setAnnouncementImage(null);
            setAnnouncementLinkUrl('');
            setNoticeFontFamily('Pretendard');
            setNoticeFontSize('md');
            setNoticeHighlightGradient('purple');
            setNoticeHighlightStyle('gradient');
            await loadAnnouncements();
            setLoungeView('list');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setError('등록 실패: ' + (err.message || '알 수 없는 오류'));
        } finally {
            setIsPosting(false);
        }
    };

    // Phase 2: 주간 리포트 발송
    const handleSendReport = async () => {
        const trimmedUrl = reportWebhookUrl.trim();
        if (!trimmedUrl) {
            setError(reportWebhookType === 'email' ? '이메일 주소를 입력해주세요.' : 'Slack 또는 Discord Webhook URL을 입력해주세요.');
            return;
        }
        if (reportWebhookType !== 'email' && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            setError('올바른 Webhook URL을 입력해주세요. (http:// 또는 https:// 로 시작)');
            return;
        }
        if (reportWebhookType === 'email' && !trimmedUrl.includes('@')) {
            setError('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        setReportSending(true);
        setReportResult(null);
        setError('');
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('tour-report', {
                body: { webhookUrl: reportWebhookUrl.trim(), webhookType: reportWebhookType }
            });
            if (fnErr) throw fnErr;
            setReportResult(data);
        } catch (err) {
            setError('리포트 발송 실패: ' + err.message);
        } finally {
            setReportSending(false);
        }
    };

    // Phase 3: AI 에이전시 동향 분석
    const handleAiSummary = async (agencyName) => {
        setAiSummaryLoading(prev => ({ ...prev, [agencyName]: true }));
        setAiSummaryResult(prev => ({ ...prev, [agencyName]: null }));
        setError('');
        try {
            const { data, error: fnErr } = await supabase.functions.invoke('ai-diary-summary', {
                body: { agencyName }
            });
            if (fnErr) throw fnErr;
            if (!data?.success) throw new Error(data?.error || 'AI 분석 실패');
            setAiSummaryResult(prev => ({ ...prev, [agencyName]: data.summary }));
            setAiSummaryAgency(agencyName);
        } catch (err) {
            setError('AI 분석 실패: ' + err.message);
        } finally {
            setAiSummaryLoading(prev => ({ ...prev, [agencyName]: false }));
        }
    };

    // 투어일지 삭제 (어드민)
    const handleDeleteDiary = async (diaryId) => {
        if (!window.confirm('이 투어일지를 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase
                .from('tour_diaries')
                .delete()
                .eq('id', diaryId);
            if (error) throw error;
            setTourDiaries(prev => prev.filter(d => d.id !== diaryId));
            setSuccessMsg('투어일지가 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setError('삭제 실패: ' + err.message);
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

    const grades = ['SILVER', 'GOLD', 'IMODEL', 'VIP'];

    // 모든 유저의 등급을 일관되게 매핑 (BASIC -> SILVER 등)
    const processedUsers = useMemo(() => users.map(u => {
        let currentGrade = u.grade || 'SILVER';
        if (currentGrade === 'BASIC') currentGrade = 'SILVER';
        return { ...u, grade: currentGrade };
    }), [users]);

    // 필터링된 유저 (표에 표시될 데이터)
    const filteredUsers = useMemo(() => processedUsers.filter(u => {
        const matchGrade = filterGrade === 'ALL'
            ? true
            : filterGrade === 'CLASS'
                ? (userClassAppCounts[u.id] ?? 0) > 0
                : u.grade === filterGrade;
        const matchSearch = !searchQuery ||
            u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.name?.includes(searchQuery) ||
            u.phone?.includes(searchQuery);
        return matchGrade && matchSearch;
    }), [processedUsers, filterGrade, searchQuery, userClassAppCounts]);

    // 등급별 통계 (전체 회원 대상, 검색어가 있다면 검색 결과 대상)
    // 상단 카드는 선택된 '등급 필터'에 영향을 받지 않고 전체 분포를 보여줍니다.
    // 만약 '수강생만' 필터가 켜져 있다면(filterGrade === 'CLASS'), 등급별 수치도 수강생 기준 분포로 보여줍니다.
    const gradeStats = useMemo(() => grades.reduce((acc, g) => {
        const baseListForStats = processedUsers.filter(u => {
            const matchSearch = !searchQuery ||
                u.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.name?.includes(searchQuery) ||
                u.phone?.includes(searchQuery);
            const matchClass = filterGrade !== 'CLASS' || (userClassAppCounts[u.id] ?? 0) > 0;
            return matchSearch && matchClass;
        });

        acc[g] = baseListForStats.filter(u => u.grade === g).length;
        return acc;
    }, {}), [processedUsers, searchQuery, filterGrade, userClassAppCounts]);

    // 조회수 통계 계산
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats1Day = pageViews.filter(v => new Date(v.accessed_at) > oneDayAgo).length;
    const stats7Days = pageViews.filter(v => new Date(v.accessed_at) > sevenDaysAgo).length;
    const stats30Days = pageViews.filter(v => new Date(v.accessed_at) > thirtyDaysAgo).length;

    // 인기 페이지 랭킹 계산 (최근 30일 기준)
    const recent30DaysViews = pageViews.filter(v => new Date(v.accessed_at) > thirtyDaysAgo);
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

    const monthlyUserCount = {};
    thisMonthDiaries.forEach(d => {
        const nick = d.nickname || 'guest';
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
    const placeCount = {};
    thisYearDiaries.forEach(d => {
        const agency = d.agency_name || '알 수 없음';
        placeCount[agency] = (placeCount[agency] || 0) + 1;
    });

    const top5Places = Object.entries(placeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // ==========================================
    // 3. 가입자 및 방문/활동 통계 (성별 및 연령대 비율)
    // ==========================================
    const totalUsersCount = users.length;
    const signupMaleCount = users.filter(u => u.gender === '남').length;
    const signupFemaleCount = users.filter(u => u.gender === '여').length;
    const signupUnspecifiedGenderCount = totalUsersCount - signupMaleCount - signupFemaleCount;

    const signupMalePercent = totalUsersCount ? Math.round((signupMaleCount / totalUsersCount) * 100) : 0;
    const signupFemalePercent = totalUsersCount ? Math.round((signupFemaleCount / totalUsersCount) * 100) : 0;
    const signupUnspecifiedGenderPercent = totalUsersCount ? (100 - signupMalePercent - signupFemalePercent) : 0;

    const getAge = (ageStr) => {
        if (!ageStr) return null;
        const val = parseInt(ageStr, 10);
        if (isNaN(val)) return null;
        if (val > 1900) return currentYear - val; // birth year
        return val; // direct age
    };

    const signupAgeGroups = {
        under20: 0,
        age20s: 0,
        age30s: 0,
        age40s: 0,
        age50s: 0,
        age60s: 0,
        age70s: 0,
        age80sPlus: 0,
        unspecified: 0
    };

    users.forEach(u => {
        const age = getAge(u.age);
        if (age === null) {
            signupAgeGroups.unspecified++;
        } else if (age < 20) {
            signupAgeGroups.under20++;
        } else if (age >= 20 && age <= 29) {
            signupAgeGroups.age20s++;
        } else if (age >= 30 && age <= 39) {
            signupAgeGroups.age30s++;
        } else if (age >= 40 && age <= 49) {
            signupAgeGroups.age40s++;
        } else if (age >= 50 && age <= 59) {
            signupAgeGroups.age50s++;
        } else if (age >= 60 && age <= 69) {
            signupAgeGroups.age60s++;
        } else if (age >= 70 && age <= 79) {
            signupAgeGroups.age70s++;
        } else {
            signupAgeGroups.age80sPlus++;
        }
    });



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




    // 인증 전 - 비밀번호 입력 화면
    if (!authenticated) {
        return (
            <div className="min-h-screen bg-[var(--moca-bg)] flex items-center justify-center p-4">
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl w-full max-w-sm p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-[var(--moca-primary-lt)] flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-[var(--moca-primary)] text-[32px]">admin_panel_settings</span>
                        </div>
                        <h1 className="text-2xl font-black text-[var(--moca-text)]">관리자 페이지</h1>
                        <p className="text-[var(--moca-text-3)] text-sm mt-1">아임모델 어드민</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                            placeholder="관리자 비밀번호"
                            autoFocus
                        />
                        {passwordError && (
                            <p className="text-red-400 text-sm text-center">{passwordError}</p>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-[var(--moca-primary)] to-[var(--moca-accent)] text-white font-black py-3 rounded-xl transition-all hover:opacity-90"
                        >
                            로그인
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-sm transition-colors py-2"
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
        <div className="min-h-screen bg-[var(--moca-bg)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[var(--moca-border)] px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--moca-primary)]">admin_panel_settings</span>
                        <h1 className="text-lg font-black text-[var(--moca-text)]">아임모델 어드민</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {successMsg && (
                            <span className="text-green-400 text-sm font-bold animate-pulse">{successMsg}</span>
                        )}
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--moca-surface-2)] hover:bg-[var(--moca-primary-lt)] border border-[var(--moca-border)] text-sm font-bold transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            새로고침
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1 text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-sm transition-colors mr-2"
                        >
                            <span className="material-symbols-outlined text-[16px]">logout</span>
                            로그아웃
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-sm transition-colors"
                        >
                            ← 나가기
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* 탭 네비게이션 */}
                <div className="flex gap-1 mb-8 border-b border-[var(--moca-border)] overflow-x-auto admin-tab-scrollbar whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'users' ? 'border-[var(--moca-primary)] text-[var(--moca-primary)] bg-[var(--moca-primary)]/5' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        회원 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'stats' ? 'border-[var(--moca-primary)] text-[var(--moca-primary)] bg-[var(--moca-primary)]/5' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        조회수 통계
                    </button>

                    <button
                        onClick={() => { setActiveTab('lounge'); setLoungeView('list'); loadAnnouncements(); }}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'lounge' ? 'border-violet-500 text-violet-700 bg-violet-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        아임모카 공지
                    </button>
                    <button
                        onClick={() => setActiveTab('message')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'message' ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        메시지 발송
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('certifications');
                            setCertLoading(true);
                            const data = await fetchAllCertPostsForAdmin(false);
                            setCertPosts(data);
                            setCertLoading(false);
                        }}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'certifications' ? 'border-pink-500 text-pink-700 bg-pink-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        📸 인증샷 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('popups')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'popups' ? 'border-rose-500 text-rose-700 bg-rose-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        🎯 팝업 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('contracts')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'contracts' ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        📝 전속계약 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'classes' ? 'border-indigo-500 text-indigo-700 bg-indigo-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                            }`}
                    >
                        🎓 모카 클래스
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'subscriptions' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        👑 등업 신청 관리
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('currentphotos');
                            setCurrentPhotosLoading(true);
                            const data = await fetchAllCurrentPhotos();
                            setCurrentPhotos(data);
                            setCurrentPhotosLoading(false);
                        }}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'currentphotos' ? 'border-cyan-500 text-cyan-700 bg-cyan-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        📸 현재모습 사진
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('qna');
                            setQnaLoading(true);
                            const data = await fetchAllQnaPostsForAdmin();
                            setQnaPosts(data);
                            setQnaLoading(false);
                        }}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'qna' ? 'border-teal-500 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        💬 Q&A 게시판
                    </button>
                    <button
                        onClick={() => setActiveTab('homepage')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'homepage' ? 'border-sky-500 text-sky-700 bg-sky-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        🏠 홈화면 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('diaries')}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'diaries' ? 'border-purple-500 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        📒 투어일지 관리
                    </button>
                    <button
                        onClick={async () => {
                            setActiveTab('pushhistory');
                            setNoPushLoading(true);
                            const [histResult, noPushResult, allPhoneResult] = await Promise.all([
                                fetchPushHistory(10),
                                fetchUsersWithoutPushToken(),
                                fetchAllUsersWithPhone(),
                            ]);
                            setPushHistory(histResult.data || []);
                            setNoPushUsers(noPushResult.data || []);
                            setNoAppUsers(noPushResult.noAppUsers || []);
                            setNoPermissionUsers(noPushResult.noPermissionUsers || []);
                            setAllPhoneUsers(allPhoneResult.data || []);
                            setNoPushLoading(false);
                        }}
                        className={`pb-3 px-3 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${activeTab === 'pushhistory' ? 'border-red-500 text-red-700 bg-red-50' : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'}`}
                    >
                        🔔 알림·메시지 센터
                    </button>

                </div>

                {/* ============================================================ */}
                {/* 📒 투어일지 관리 탭 */}
                {/* ============================================================ */}
                {activeTab === 'diaries' && (() => {
                    // 에이전시 목록 추출
                    const agencyList = ['ALL', ...Array.from(new Set(tourDiaries.map(d => d.agency_name).filter(Boolean))).sort()];

                    // 기간 필터 적용
                    const now = new Date();
                    const filteredByDate = tourDiaries.filter(d => {
                        if (diaryDateFilter === 'all') return true;
                        const dDate = new Date(d.date || d.timestamp || d.created_at);
                        if (diaryDateFilter === '7d') return (now - dDate) <= 7 * 24 * 60 * 60 * 1000;
                        if (diaryDateFilter === '30d') return (now - dDate) <= 30 * 24 * 60 * 60 * 1000;
                        return true;
                    });

                    // 에이전시 + 검색 필터
                    const filteredDiaries = filteredByDate.filter(d => {
                        const matchAgency = diaryFilterAgency === 'ALL' || d.agency_name === diaryFilterAgency;
                        const query = diarySearch.toLowerCase();
                        const matchSearch = !diarySearch ||
                            (d.agency_name || '').toLowerCase().includes(query) ||
                            (d.nickname || '').toLowerCase().includes(query) ||
                            (d.content || '').toLowerCase().includes(query);
                        return matchAgency && matchSearch;
                    });

                    // 에이전시별 그룹핑
                    const groupedByAgency = filteredDiaries.reduce((acc, d) => {
                        const agency = d.agency_name || '에이전시 미기재';
                        if (!acc[agency]) acc[agency] = [];
                        acc[agency].push(d);
                        return acc;
                    }, {});

                    // 통계 계산
                    const totalDiaries = filteredDiaries.length;
                    const totalAgencies = Object.keys(groupedByAgency).length;
                    const totalWriters = new Set(filteredDiaries.map(d => d.nickname).filter(Boolean)).size;
                    const recentDiaries = filteredDiaries.filter(d => {
                        const dDate = new Date(d.date || d.timestamp);
                        return (now - dDate) <= 7 * 24 * 60 * 60 * 1000;
                    }).length;

                    return (
                        <div className="animate-fadeIn">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-400 text-[18px]">error</span>
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* ── Phase 2: 주간 리포트 발송 패널 ── */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="material-symbols-outlined text-indigo-500">send</span>
                                    <h3 className="font-black text-[var(--moca-text)] text-[15px]">📨 주간 투어일지 리포트 발송</h3>
                                    <span className="text-[11px] text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full font-bold">Phase 2</span>
                                </div>
                                <p className="text-[12px] text-gray-500 mb-4">최근 7일간 투어일지를 이메일, Slack 또는 Discord로 리포트를 보냅니다. 대상 주소는 저장되지 않으니 매번 입력해주세요.</p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    {/* 플랫폼 선택 */}
                                    <div className="flex gap-1.5 shrink-0">
                                        {[{v:'email',l:'이메일',icon:'📧'},{v:'slack',l:'Slack',icon:'💬'},{v:'discord',l:'Discord',icon:'🎮'}].map(opt => (
                                            <button
                                                key={opt.v}
                                                onClick={() => {
                                                    setReportWebhookType(opt.v);
                                                    if (opt.v === 'email') {
                                                        setReportWebhookUrl('immodelkr@gmail.com');
                                                    } else {
                                                        if (reportWebhookUrl.includes('@')) {
                                                            setReportWebhookUrl('');
                                                        }
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                    reportWebhookType === opt.v
                                                    ? 'bg-indigo-500 text-white border-indigo-500'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                                }`}
                                            >{opt.icon} {opt.l}</button>
                                        ))}
                                    </div>
                                    {/* Webhook URL 입력 */}
                                    <input
                                        type="text"
                                        value={reportWebhookUrl}
                                        onChange={e => setReportWebhookUrl(e.target.value)}
                                        placeholder={reportWebhookType === 'email' ? '받으실 이메일 주소 (예: admin@immodel.kr)' : reportWebhookType === 'slack' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...'}
                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[var(--moca-text)] placeholder-gray-300 focus:outline-none focus:border-indigo-400 transition-colors"
                                    />
                                    {/* 발송 버튼 */}
                                    <button
                                        onClick={handleSendReport}
                                        disabled={reportSending}
                                        className="shrink-0 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-black transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {reportSending ? (
                                            <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> 발송 중...</>
                                        ) : (
                                            <><span className="material-symbols-outlined text-[16px]">send</span> 리포트 발송</>
                                        )}
                                    </button>
                                </div>
                                {/* 발송 결과 */}
                                {reportResult && (
                                    <div className={`mt-3 p-3 rounded-xl text-sm font-bold ${
                                        reportResult.success ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'
                                    }`}>
                                        {reportResult.success ? '✅ ' : '❌ '}{reportResult.message || reportResult.error}
                                        {reportResult.success && reportResult.summary && (
                                            <span className="ml-2 text-xs font-normal text-gray-500">
                                                (총 {reportResult.summary.total}건 · {reportResult.summary.writers}명 · 에이전시 {reportResult.summary.agencies}곳)
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="mt-3 p-3 bg-white/70 rounded-xl">
                                    <p className="text-[11px] text-gray-500 font-bold mb-1">⚙️ Supabase Edge Function 배포 필요</p>
                                    <p className="text-[11px] text-gray-400">Supabase 대시보드 → Edge Functions → <code className="bg-gray-100 px-1 rounded">tour-report</code> 를 배포하고,
                                    Secrets에 <code className="bg-gray-100 px-1 rounded">SUPABASE_URL</code>, <code className="bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> 를 등록해주세요.</p>
                                </div>
                            </div>

                            {/* ── AI 분석 모달 ── */}
                            {aiSummaryAgency && aiSummaryResult[aiSummaryAgency] && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setAiSummaryAgency(null)}>
                                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🤖</span>
                                                <div>
                                                    <h3 className="font-black text-[var(--moca-text)] text-[15px]">AI 동향 분석</h3>
                                                    <p className="text-[12px] text-purple-500 font-bold">{aiSummaryAgency}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setAiSummaryAgency(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                                                <span className="material-symbols-outlined text-[18px] text-gray-500">close</span>
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                { icon: '🎬', label: '진행 오디션/미팅', key: 'auditioning', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                                                { icon: '📋', label: '필수 준비물 & 꿀팁', key: 'tips', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                                { icon: '🏢', label: '현장 분위기 & 대기', key: 'atmosphere', color: 'bg-green-50 border-green-200 text-green-700' },
                                                { icon: '👗', label: '선호 스타일 & 피드백', key: 'preferred', color: 'bg-pink-50 border-pink-200 text-pink-700' },
                                                { icon: '⚠️', label: '주의 및 특이사항', key: 'warnings', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                                                { icon: '⚡', label: '한줄 요약', key: 'overall', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                                            ].map(item => (
                                                <div key={item.key} className={`p-3 rounded-xl border ${item.color}`}>
                                                    <p className="text-[11px] font-black mb-1">{item.icon} {item.label}</p>
                                                    <p className="text-[13px] leading-relaxed">{aiSummaryResult[aiSummaryAgency][item.key] || '정보 없음'}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-3 text-center">최근 60일 투어일지 기반 · Gemini AI 분석</p>
                                    </div>
                                </div>
                            )}

                            {/* 요약 통계 카드 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                {[
                                    { label: '총 투어일지', value: totalDiaries, unit: '건', icon: 'edit_note', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
                                    { label: '방문 에이전시', value: totalAgencies, unit: '곳', icon: 'apartment', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                                    { label: '참여 회원', value: totalWriters, unit: '명', icon: 'group', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
                                    { label: '최근 7일', value: recentDiaries, unit: '건', icon: 'today', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
                                ].map((stat, i) => (
                                    <div key={i} className={`rounded-2xl border ${stat.border} ${stat.bg} p-5`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`material-symbols-outlined ${stat.color} text-[20px]`}>{stat.icon}</span>
                                            <p className="text-xs font-bold text-gray-500">{stat.label}</p>
                                        </div>
                                        <p className="text-3xl font-black text-[var(--moca-text)]">{stat.value.toLocaleString()}<span className="text-sm font-normal text-gray-400 ml-1">{stat.unit}</span></p>
                                    </div>
                                ))}
                            </div>

                            {/* 필터 영역 */}
                            <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-4 mb-6">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* 검색 */}
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
                                        <input
                                            type="text"
                                            value={diarySearch}
                                            onChange={e => setDiarySearch(e.target.value)}
                                            placeholder="에이전시명, 닉네임, 일지 내용 검색..."
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl pl-10 pr-4 py-2.5 text-[var(--moca-text)] placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors text-sm"
                                        />
                                    </div>
                                    {/* 에이전시 필터 */}
                                    <select
                                        value={diaryFilterAgency}
                                        onChange={e => setDiaryFilterAgency(e.target.value)}
                                        className="bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text)] text-sm rounded-xl px-3 py-2.5 outline-none focus:border-purple-400 min-w-[140px] shrink-0"
                                    >
                                        {agencyList.map(a => (
                                            <option key={a} value={a}>{a === 'ALL' ? '전체 에이전시' : a}</option>
                                        ))}
                                    </select>
                                    {/* 기간 필터 */}
                                    <div className="flex gap-1.5 shrink-0">
                                        {[{v:'all',l:'전체'},{v:'30d',l:'최근 30일'},{v:'7d',l:'최근 7일'}].map(opt => (
                                            <button
                                                key={opt.v}
                                                onClick={() => setDiaryDateFilter(opt.v)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                    diaryDateFilter === opt.v
                                                    ? 'bg-purple-500 text-white border-purple-500'
                                                    : 'bg-[var(--moca-surface-2)] text-gray-500 border-[var(--moca-border)] hover:border-purple-300'
                                                }`}
                                            >{opt.l}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 결과 요약 */}
                            <p className="text-sm text-gray-500 font-bold mb-4">
                                🔍 총 <span className="text-purple-600">{totalDiaries.toLocaleString()}</span>건의 투어일지 · <span className="text-blue-600">{totalAgencies}</span>개 에이전시
                            </p>

                            {filteredDiaries.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <span className="material-symbols-outlined text-[48px] text-gray-300 block mb-3">inbox</span>
                                    <p className="font-bold">조건에 맞는 투어일지가 없습니다.</p>
                                    <p className="text-sm mt-1">필터나 검색어를 변경해보세요.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(groupedByAgency)
                                        .sort((a, b) => b[1].length - a[1].length)
                                        .map(([agencyName, diaries]) => {
                                            // 해당 에이전시 일지 작성자 수
                                            const writers = new Set(diaries.map(d => d.nickname).filter(Boolean)).size;
                                            // 최근 방문일
                                            const latestDate = diaries.reduce((max, d) => {
                                                const cur = new Date(d.date || d.timestamp);
                                                return cur > max ? cur : max;
                                            }, new Date(0));
                                            const latestDateStr = latestDate.getFullYear() > 2000 ? latestDate.toLocaleDateString('ko-KR') : '-';

                                            return (
                                                <div key={agencyName} className="bg-white border border-[var(--moca-border)] rounded-2xl overflow-hidden shadow-sm">
                                                    {/* 에이전시 헤더 */}
                                                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 px-5 py-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                                                    <span className="material-symbols-outlined text-purple-500 text-[20px]">apartment</span>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-black text-[var(--moca-text)] text-[15px]">{agencyName}</h3>
                                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                                        일지 <span className="font-bold text-purple-500">{diaries.length}건</span>
                                                                        &nbsp;·&nbsp;작성 회원 <span className="font-bold text-blue-500">{writers}명</span>
                                                                        &nbsp;·&nbsp;최근 방문 <span className="font-bold text-gray-600">{latestDateStr}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {/* AI 동향 분석 버튼 (Phase 3) */}
                                                                <button
                                                                    onClick={() => handleAiSummary(agencyName)}
                                                                    disabled={aiSummaryLoading[agencyName]}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[11px] font-black transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                                                                    title="AI로 이 에이전시의 최근 동향을 분석합니다"
                                                                >
                                                                    {aiSummaryLoading[agencyName] ? (
                                                                        <><span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> 분석 중...</>
                                                                    ) : aiSummaryResult[agencyName] ? (
                                                                        <><span className="text-[12px]">🤖</span> AI 재분석</>
                                                                    ) : (
                                                                        <><span className="text-[12px]">🤖</span> AI 동향 분석</>
                                                                    )}
                                                                </button>
                                                                {/* AI 결과 보기 버튼 */}
                                                                {aiSummaryResult[agencyName] && (
                                                                    <button
                                                                        onClick={() => setAiSummaryAgency(agencyName)}
                                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-100 text-violet-600 text-[11px] font-black hover:bg-violet-200 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px]">visibility</span> 결과 보기
                                                                    </button>
                                                                )}
                                                                <span className="text-[11px] font-black text-purple-400 bg-purple-100 px-2 py-1 rounded-full">{diaries.length}건</span>
                                                            </div>
                                                        </div>
                                                        {/* AI 한줄 요약 인라인 미리보기 */}
                                                        {aiSummaryResult[agencyName] && (
                                                            <div className="mt-3 p-3 bg-white/80 rounded-xl border border-violet-200 text-[12px] text-gray-700">
                                                                <span className="font-black text-violet-600">⚡ {aiSummaryResult[agencyName].overall}</span>
                                                            </div>
                                                        )}
                                                    </div>


                                                    {/* 일지 리스트 */}
                                                    <div className="divide-y divide-gray-50">
                                                        {diaries.map(d => {
                                                            const authorUser = users.find(u => u.nickname === d.nickname) || {};
                                                            const diaryDate = d.date ? new Date(d.date).toLocaleDateString('ko-KR') : '-';
                                                            const writtenAt = d.timestamp ? new Date(d.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                                                            const isExpanded = diaryExpandedId === d.id;
                                                            const isLong = (d.content || '').length > 100;

                                                            return (
                                                                <div key={d.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                            {/* 회원 아이콘 */}
                                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5">
                                                                                {(d.nickname || 'G')[0].toUpperCase()}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                {/* 작성자 + 날짜 */}
                                                                                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-1.5">
                                                                                    <button
                                                                                        onClick={() => setSelectedUserForDetail(authorUser.id ? authorUser : null)}
                                                                                        className={`text-[13px] font-black hover:text-purple-600 transition-colors ${authorUser.id ? 'text-[var(--moca-text)] cursor-pointer' : 'text-gray-500 cursor-default'}`}
                                                                                        disabled={!authorUser.id}
                                                                                    >
                                                                                        {d.nickname || '(미로그인)'}
                                                                                    </button>
                                                                                    {authorUser.name && (
                                                                                        <span className="text-[11px] text-gray-400">{authorUser.name}</span>
                                                                                    )}
                                                                                    {authorUser.grade && (
                                                                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                                                                            authorUser.grade === 'VIP' ? 'bg-red-100 text-red-500' :
                                                                                            authorUser.grade === 'IMODEL' ? 'bg-purple-100 text-purple-500' :
                                                                                            authorUser.grade === 'GOLD' ? 'bg-yellow-100 text-yellow-600' :
                                                                                            'bg-gray-100 text-gray-500'
                                                                                        }`}>{authorUser.grade}</span>
                                                                                    )}
                                                                                    <span className="text-[11px] text-gray-400">방문 {diaryDate}</span>
                                                                                    <span className="text-[11px] text-gray-300">작성 {writtenAt}</span>
                                                                                </div>
                                                                                {/* 일지 내용 */}
                                                                                <p className={`text-[13px] text-[var(--moca-text-2)] leading-relaxed whitespace-pre-wrap break-words ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                                                                                    {d.content || '(내용 없음)'}
                                                                                </p>
                                                                                {isLong && (
                                                                                    <button
                                                                                        onClick={() => setDiaryExpandedId(isExpanded ? null : d.id)}
                                                                                        className="text-[11px] text-purple-500 font-bold mt-1 hover:underline"
                                                                                    >
                                                                                        {isExpanded ? '▲ 접기' : '▼ 더 보기'}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {/* 삭제 버튼 */}
                                                                        <button
                                                                            onClick={() => handleDeleteDiary(d.id)}
                                                                            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                                                            title="일지 삭제"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            )}
                        </div>
                    );
                })()}

                {activeTab === 'stats' && (
                    <div className="animate-fadeIn">
                        {/* 1일/1주/1달 통계 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: '오늘 방문 (24h)', value: stats1Day, icon: 'today', color: 'text-blue-400' },
                                { label: '주간 방문 (7d)', value: stats7Days, icon: 'date_range', color: 'text-purple-400' },
                                { label: '월간 방문 (30d)', value: stats30Days, icon: 'calendar_month', color: 'text-pink-400' }
                            ].map((stat, i) => (
                                <div key={i} className="rounded-2xl border border-[var(--moca-border)] bg-[var(--moca-surface-2)] p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-[var(--moca-surface-2)] flex items-center justify-center">
                                            <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                                        </div>
                                        <h3 className="text-[var(--moca-text-2)] text-sm font-bold tracking-widest">{stat.label}</h3>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <p className="text-4xl font-black text-[var(--moca-text)]">{stat.value.toLocaleString()}</p>
                                        <p className="text-[var(--moca-text-3)] text-sm mb-1 pb-0.5">조회</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 가입 및 활동 분석 (성별 / 연령대 비율) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 animate-fadeIn">
                            {/* 성별 비율 카드 */}
                            <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6">
                                <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-purple-500">wc</span>
                                    회원 성별 분포
                                </h3>
                                <p className="text-[var(--moca-text-3)] text-[11px] mb-4">전체 가입자의 성별 비율</p>
                                
                                <div className="space-y-6">
                                    {/* 가입자 성별 비율 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-[var(--moca-text-2)]">전체 가입자 ({totalUsersCount}명)</span>
                                            <span className="text-xs text-[var(--moca-text-3)] font-bold">
                                                남 {signupMalePercent}% | 여 {signupFemalePercent}%
                                                {signupUnspecifiedGenderCount > 0 && ` | 미지정 ${signupUnspecifiedGenderPercent}%`}
                                            </span>
                                        </div>
                                        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-blue-400 transition-all" style={{ width: `${signupMalePercent}%` }} title={`남성: ${signupMaleCount}명`} />
                                            <div className="h-full bg-pink-400 transition-all" style={{ width: `${signupFemalePercent}%` }} title={`여성: ${signupFemaleCount}명`} />
                                            <div className="h-full bg-gray-300 transition-all" style={{ width: `${signupUnspecifiedGenderPercent}%` }} title={`미지정: ${signupUnspecifiedGenderCount}명`} />
                                        </div>
                                    </div>
                                    
                                    {/* 안내 라벨 */}
                                    <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-xs font-bold">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
                                            <span className="text-gray-600">남성 ({signupMaleCount}명)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-pink-400 rounded-full"></span>
                                            <span className="text-gray-600">여성 ({signupFemaleCount}명)</span>
                                        </div>
                                        {signupUnspecifiedGenderCount > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 bg-gray-300 rounded-full"></span>
                                                <span className="text-gray-600">미지정 ({signupUnspecifiedGenderCount}명)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 연령대 비율 카드 */}
                            <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6">
                                <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-purple-500">bar_chart</span>
                                    회원 연령대 분포
                                </h3>
                                <p className="text-[var(--moca-text-3)] text-[11px] mb-4">10대부터 80대 이상까지의 가입 분포 비율</p>
                                
                                <div className="space-y-3 max-h-[185px] overflow-y-auto pr-1">
                                    {[
                                        { label: '20대 미만', key: 'under20' },
                                        { label: '20대', key: 'age20s' },
                                        { label: '30대', key: 'age30s' },
                                        { label: '40대', key: 'age40s' },
                                        { label: '50대', key: 'age50s' },
                                        { label: '60대', key: 'age60s' },
                                        { label: '70대', key: 'age70s' },
                                        { label: '80대 이상', key: 'age80sPlus' },
                                        { label: '미지정', key: 'unspecified' }
                                    ].map(({ label, key }) => {
                                        const signupCount = signupAgeGroups[key] || 0;
                                        const signupPct = totalUsersCount ? Math.round((signupCount / totalUsersCount) * 100) : 0;

                                        if (signupCount === 0) return null; // 가입 인원이 없으면 숨김

                                        return (
                                            <div key={key} className="flex flex-col gap-1 py-1 border-b border-gray-50 last:border-0">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-[var(--moca-text-2)]">{label}</span>
                                                    <span className="text-xs font-bold text-[var(--moca-text)]">{signupCount}명 ({signupPct}%)</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${signupPct}%` }} title={`가입: ${signupCount}명`} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 프로필 발송 통계 */}
                        <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6 mb-6">
                            <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[var(--moca-accent)]">send</span>
                                프로필 발송 많이 받은 에이전시 Top 10
                            </h3>
                            <p className="text-[var(--moca-text-3)] text-[11px] mb-4">전체 기간 누적 기준 · casting_sends 테이블</p>
                            {castingStats.length === 0 ? (
                                <p className="text-[var(--moca-text-3)] text-sm py-4">아직 발송 데이터가 없습니다.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {castingStats.map(([agency, count], index) => {
                                        const maxCount = castingStats[0][1];
                                        const barWidth = Math.round((count / maxCount) * 100);
                                        return (
                                            <div key={agency} className="flex items-center gap-3 bg-[var(--moca-surface-2)] rounded-xl px-4 py-3 border border-[var(--moca-border)]">
                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                                    index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-[var(--moca-primary-lt)] text-[var(--moca-text-3)]'
                                                }`}>{index + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[13px] font-bold text-[var(--moca-text)] truncate">{agency}</span>
                                                        <span className="text-[13px] font-black text-[var(--moca-accent)] ml-2 shrink-0">{count}<span className="text-[var(--moca-text-3)] text-[10px] font-normal ml-0.5">건</span></span>
                                                    </div>
                                                    <div className="w-full h-1 bg-[var(--moca-primary-lt)] rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-[var(--moca-accent)] to-[var(--moca-primary)] rounded-full" style={{ width: `${barWidth}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 프로필 발송 (보낸 유저) 통계 */}
                        <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6 mb-6 animate-fadeIn">
                            <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[#34D399]">person_pin_circle</span>
                                프로필 발송 많이 보낸 유저 (모델/에이전시) Top 10
                            </h3>
                            <p className="text-[var(--moca-text-3)] text-[11px] mb-4">전체 기간 누적 기준 · casting_sends 테이블</p>
                            {senderStats.length === 0 ? (
                                <p className="text-[var(--moca-text-3)] text-sm py-4">아직 발송 데이터가 없습니다.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {senderStats.map(([nickname, count], index) => {
                                        const maxCount = senderStats[0][1];
                                        const barWidth = Math.round((count / maxCount) * 100);
                                        const uInfo = users.find(u => u.nickname === nickname) || {};
                                        return (
                                            <div key={nickname} className="flex items-center gap-3 bg-[var(--moca-surface-2)] rounded-xl px-4 py-3 border border-[var(--moca-border)]">
                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                                    index === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                                                    index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                    index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                    'bg-[var(--moca-primary-lt)] text-[var(--moca-text-3)]'
                                                }`}>{index + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-baseline gap-1.5 truncate">
                                                            <span className="text-[13px] font-bold text-[var(--moca-text)] truncate">{uInfo.name || '-'}</span>
                                                            <span className="text-[10px] text-[var(--moca-text-3)] truncate">({nickname})</span>
                                                        </div>
                                                        <span className="text-[13px] font-black text-[#34D399] ml-2 shrink-0">{count}<span className="text-[var(--moca-text-3)] text-[10px] font-normal ml-0.5">건</span></span>
                                                    </div>
                                                    <div className="w-full h-1 bg-[var(--moca-primary-lt)] rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-[#34D399] to-[#10B981] rounded-full" style={{ width: `${barWidth}%` }} />
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
                            <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6 lg:col-span-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-400">group</span>
                                        {statsMonth === 0 ? '올해 총 우수 멤버 Top 10' : `${statsMonth}월 우수 멤버 Top 10`}
                                    </h3>
                                    <select
                                        value={statsMonth}
                                        onChange={(e) => setStatsMonth(Number(e.target.value))}
                                        className="bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text)] text-xs rounded-lg px-2 py-1 outline-none focus:border-[var(--moca-primary)]"
                                    >
                                        <option value={0}>올해 전체</option>
                                        {[...Array(12).keys()].map(m => (
                                            <option key={m + 1} value={m + 1}>{m + 1}월</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[var(--moca-text-3)] text-[11px] mb-4">제휴처 및 에이전시 방문 기록 합산</p>
                                {top10Users.length === 0 ? (
                                    <p className="text-[var(--moca-text-3)] text-sm py-4">아직 방문 데이터가 없습니다.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {top10Users.map((user, index) => (
                                            <div key={user.nickname} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-[var(--moca-primary-lt)] text-[var(--moca-text-3)]'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-sm font-bold text-[var(--moca-text)] leading-none">{user.name}</span>
                                                            <span className="text-[11px] text-[var(--moca-text-2)] leading-none">({user.nickname})</span>
                                                        </div>
                                                        <span className="text-[10px] text-[var(--moca-text-3)] tracking-tight">{user.phone}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-black text-[var(--moca-text)]">
                                                    {user.count.toLocaleString()} <span className="text-[var(--moca-text-3)] text-[10px] font-normal">회</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 멤버들 최다 방문처 Top 5 */}
                            <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6 lg:col-span-1">
                                <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-pink-400">storefront</span>
                                    올해의 최다 방문처 Top 5
                                </h3>
                                <p className="text-[var(--moca-text-3)] text-[11px] mb-4">멤버들이 투어/제휴로 가장 많이 찾은 곳</p>
                                {top5Places.length === 0 ? (
                                    <p className="text-[var(--moca-text-3)] text-sm py-4">아직 방문 데이터가 없습니다.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {top5Places.map(([place, count], index) => (
                                            <div key={place} className="flex items-center justify-between p-3 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-pink-500/20 text-pink-400' :
                                                        index === 1 ? 'bg-purple-500/20 text-purple-300' :
                                                            index === 2 ? 'bg-indigo-500/20 text-indigo-400' :
                                                                'bg-[var(--moca-primary-lt)] text-[var(--moca-text-3)]'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-[13px] font-bold text-[var(--moca-text)] line-clamp-1">{place}</span>
                                                </div>
                                                <div className="text-[13px] font-black text-[var(--moca-text)]">
                                                    {count.toLocaleString()} <span className="text-[var(--moca-text-3)] text-[10px] font-normal">건</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 인기 방문 페이지 Top 5 */}
                            <div className="rounded-2xl border border-[var(--moca-border)] bg-white p-6 lg:col-span-1">
                                <h3 className="text-[var(--moca-text)] font-bold flex items-center gap-2 mb-1">
                                    <span className="material-symbols-outlined text-[var(--moca-primary)]">local_fire_department</span>
                                    인기 방문 앱 페이지 Top 5
                                </h3>
                                <p className="text-[var(--moca-text-3)] text-[11px] mb-4">최근 30일 접속 통계 기준</p>
                                {popularPages.length === 0 ? (
                                    <p className="text-[var(--moca-text-3)] text-sm py-4">아직 접속 통계가 없습니다.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {popularPages.map(([path, count], index) => (
                                            <div key={path} className="flex items-center justify-between p-3 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-[var(--moca-primary-lt)] text-[var(--moca-text-3)]'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-[13px] font-medium text-[var(--moca-text-2)] line-clamp-1">{path}</span>
                                                </div>
                                                <div className="text-[13px] font-black text-[var(--moca-text)] text-right">
                                                    {count.toLocaleString()}<span className="text-[var(--moca-text-3)] text-[10px] ml-1">회</span>
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
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
                            {grades.map(grade => {
                                const info = GRADE_INFO[grade];
                                const emoji = GRADE_EMOJI[grade];
                                return (
                                    <div
                                        key={grade}
                                        onClick={() => setFilterGrade(filterGrade === grade ? 'ALL' : grade)}
                                        className={`rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.02] ${filterGrade === grade
                                            ? 'bg-[var(--moca-primary-lt)] border-[var(--moca-primary)]'
                                            : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] hover:bg-[var(--moca-primary-lt)]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl">{emoji}</span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${info.bg} ${info.text}`}>
                                                {info.label}
                                            </span>
                                        </div>
                                        <p className="text-3xl font-black text-[var(--moca-text)]">
                                            {loading ? (
                                                <span className="text-sm font-medium text-[var(--moca-text-3)] animate-pulse">불러오는 중...</span>
                                            ) : (
                                                gradeStats[grade] || 0
                                            )}
                                        </p>
                                        <p className="text-[var(--moca-text-3)] text-xs mt-1">명</p>
                                    </div>
                                );
                            })}
                            {/* 총회원 카드 */}
                            <div
                                onClick={() => setFilterGrade('ALL')}
                                className={`rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.02] ${filterGrade === 'ALL'
                                    ? 'bg-[var(--moca-primary-lt)] border-[var(--moca-primary)]'
                                    : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] hover:bg-[var(--moca-primary-lt)]'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">👥</span>
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                        총회원
                                    </span>
                                </div>
                                <p className="text-3xl font-black text-[var(--moca-text)]">
                                    {loading ? (
                                        <span className="text-sm font-medium text-[var(--moca-text-3)] animate-pulse">불러오는 중...</span>
                                    ) : (
                                        processedUsers.length
                                    )}
                                </p>
                                <p className="text-[var(--moca-text-3)] text-xs mt-1">명</p>
                            </div>
                        </div>

                        {/* 검색 & 필터 */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
                            <div className="relative flex-1 w-full">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--moca-text-3)] text-[18px]">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="닉네임, 이름, 연락처 검색..."
                                    className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl pl-10 pr-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors text-sm"
                                />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                                {['ALL', ...grades].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFilterGrade(g)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${filterGrade === g
                                            ? 'bg-[var(--moca-primary)] border-[var(--moca-primary)] text-[var(--moca-text)]'
                                            : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-[var(--moca-text)]'
                                            }`}
                                    >
                                        {g === 'ALL' ? '전체' : `${GRADE_EMOJI[g]} ${GRADE_INFO[g]?.label || g}`}
                                    </button>
                                ))}
                                {/* 수강생만 보기 필터 */}
                                <button
                                    onClick={() => setFilterGrade(filterGrade === 'CLASS' ? 'ALL' : 'CLASS')}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                                        filterGrade === 'CLASS'
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-[var(--moca-text)] hover:border-indigo-300'
                                    }`}
                                >
                                    🎓 수강생만
                                </button>
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
                                <div className="w-8 h-8 border-2 border-[var(--moca-primary)]/30 border-t-[var(--moca-primary)] rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* 회원 수 */}
                                <p className="text-[var(--moca-text-3)] text-sm mb-4">
                                    총 <span className="text-[var(--moca-text)] font-bold">{filteredUsers.length}</span>명
                                    {filterGrade !== 'ALL' && ` (${filterGrade === 'CLASS' ? '수강생만' : GRADE_INFO[filterGrade]?.label || filterGrade} 필터 중)`}
                                </p>

                                {/* 회원 테이블 */}
                                <div className="bg-white border border-[var(--moca-border)] rounded-2xl overflow-hidden w-full overflow-x-auto">
                                    <div className="min-w-[900px]">
                                        {/* Table Header */}
                                        <div className="grid gap-3 px-5 py-3 border-b border-[var(--moca-border)] text-[var(--moca-text-3)] text-xs font-black uppercase tracking-widest bg-[var(--moca-surface-2)]" style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1.5fr 0.7fr 1fr 1.5fr 0.8fr'}}>
                                            <div>닉네임</div>
                                            <div>이름</div>
                                            <div>성별</div>
                                            <div>등급</div>
                                            <div>생년</div>
                                            <div>🎓 수강</div>
                                            <div>가입일</div>
                                            <div className="text-center">관리</div>
                                        </div>

                                        {filteredUsers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-[var(--moca-text-3)]">
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
                                                        className={`grid gap-3 px-5 py-4 items-center transition-colors hover:bg-[var(--moca-primary-lt)] ${idx !== filteredUsers.length - 1 ? 'border-b border-[var(--moca-border)]' : ''}`}
                                                        style={{gridTemplateColumns:'2fr 1.5fr 0.6fr 1.5fr 0.7fr 1fr 1.5fr 0.8fr'}}
                                                    >
                                                        {/* 닉네임 */}
                                                        <div
                                                            className="flex items-center gap-2 min-w-0 cursor-pointer hover:text-[var(--moca-primary)] group"
                                                            onClick={() => setSelectedUserForDetail(user)}
                                                        >
                                                            <span className="text-lg flex-shrink-0">{emoji}</span>
                                                            <div className="min-w-0">
                                                                <p className="text-[var(--moca-text)] font-bold text-sm truncate group-hover:underline" title={user.nickname}>{user.nickname}</p>
                                                            </div>
                                                        </div>

                                                        {/* 이름 */}
                                                        <div className="text-[var(--moca-text-2)] text-sm truncate font-medium" title={user.name}>{user.name || '-'}</div>

                                                        {/* 성별 */}
                                                        <div className="text-[var(--moca-text-2)] text-sm font-medium">
                                                            {user.gender || '-'}
                                                        </div>

                                                        {/* 등급 변경 */}
                                                        <div className="flex flex-col gap-1">
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
                                                                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-lg px-2 py-1.5 text-[var(--moca-text)] text-xs font-bold focus:outline-none focus:border-[var(--moca-primary)] transition-colors cursor-pointer disabled:opacity-50"
                                                            >
                                                                {grades.map(g => {
                                                                    if (g === 'GOLD') {
                                                                        return (
                                                                            <optgroup key={g} label={`${GRADE_EMOJI[g]} ${g}`} className="bg-white">
                                                                                <option value="GOLD_1">1개월 골드</option>
                                                                                <option value="GOLD_3">3개월 골드</option>
                                                                                <option value="GOLD_6">6개월 골드</option>
                                                                                <option value="GOLD_12">12개월 골드</option>
                                                                            </optgroup>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <option key={g} value={g} className="bg-white">
                                                                            {GRADE_EMOJI[g]} {GRADE_INFO[g]?.label || g}
                                                                        </option>
                                                                    );
                                                                })}
                                                                {user.grade === 'GOLD' && (
                                                                    <option value="GOLD" className="bg-white hidden">
                                                                        🌟 GOLD (현재)
                                                                    </option>
                                                                )}
                                                            </select>
                                                            {user.grade === 'GOLD' && user.grade_expires_at && (
                                                                <span className="text-[10px] text-[var(--moca-accent)] whitespace-nowrap">
                                                                    ~ {new Date(user.grade_expires_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })} 만료
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 생년 */}
                                                        <div className="text-[var(--moca-text-2)] text-sm font-medium">
                                                            {user.age ? `${user.age}년` : '-'}
                                                        </div>

                                                        {/* 수강 신청 건수 */}
                                                        <div className="flex items-center">
                                                            {(userClassAppCounts[user.id] ?? 0) > 0 ? (
                                                                <span
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-[11px] font-black cursor-pointer hover:bg-indigo-100 transition-colors"
                                                                    onClick={() => setSelectedUserForDetail(user)}
                                                                    title="클릭하면 상세 수강 이력을 볼 수 있습니다"
                                                                >
                                                                    🎓 {userClassAppCounts[user.id]}건
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">-</span>
                                                            )}
                                                        </div>

                                                        {/* 가입일 */}
                                                        <div className="text-[var(--moca-text-3)] text-xs">
                                                            {new Date(user.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                                        </div>

                                                        {/* 관리 (계약초대 + 강퇴 버튼) */}
                                                        <div className="flex flex-col items-center gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const name = user.name || user.nickname || '회원';
                                                                    const contractUrl = `https://immoca.kr/contract?n=${encodeURIComponent(name)}`;
                                                                    const msg = `안녕하세요, ${name}님 😊\n\n아임모델 MOCA 대표 김대희입니다.\n\n${name}님께 전속계약을 제안드립니다.\n아래 링크에서 계약서 내용을 확인하고 서명을 해주세요.\n\n👉 ${contractUrl}\n\n궁금하신 점은 언제든 연락 주세요.\n감사합니다.`;
                                                                    navigator.clipboard.writeText(msg).then(() => {
                                                                        setSuccessMsg(`✅ ${name}님 계약초대 메시지가 복사되었습니다! 카카오톡으로 직접 발송해주세요.`);
                                                                        setTimeout(() => setSuccessMsg(''), 4000);
                                                                    });
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-[var(--moca-accent)] border border-purple-500/30 transition-colors"
                                                                title={`${user.name || user.nickname}님에게 계약초대 메시지 복사`}
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">contract</span>
                                                            </button>
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




                {activeTab === 'lounge' && (
                    <div className="animate-fadeIn max-w-2xl mx-auto mt-8">
                        <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-8 shadow-2xl">
                            {/* 헤더 + 탭 버튼 */}
                            <div className="flex items-center justify-between mb-6 border-b border-[var(--moca-border)] pb-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[var(--moca-accent)] text-3xl">local_police</span>
                                    <div>
                                        <h2 className="text-xl font-black text-[var(--moca-text)]">아임모카 공지</h2>
                                        <p className="text-sm text-[var(--moca-text-3)] mt-1">공지 등록 및 관리</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setLoungeView('list'); loadAnnouncements(); }}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${loungeView === 'list' ? 'bg-[var(--moca-primary-lt)] text-[var(--moca-accent)] border border-[var(--moca-primary)]/30' : 'text-[var(--moca-text-3)] hover:text-[var(--moca-text)]'}`}
                                    >목록</button>
                                    <button
                                        onClick={() => setLoungeView('write')}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${loungeView === 'write' ? 'bg-[var(--moca-primary-lt)] text-[var(--moca-accent)] border border-[var(--moca-primary)]/30' : 'text-[var(--moca-text-3)] hover:text-[var(--moca-text)]'}`}
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
                                        <div className="text-center py-12 text-[var(--moca-text-3)]">
                                            <span className="material-symbols-outlined text-[48px] mb-2 block">inbox</span>
                                            <p className="text-sm">등록된 공지가 없습니다.</p>
                                            <button onClick={() => setLoungeView('write')} className="mt-4 px-5 py-2 rounded-xl bg-[var(--moca-primary-lt)] text-[var(--moca-accent)] text-sm font-bold hover:bg-[var(--moca-primary)]/20 transition-colors">
                                                첫 공지 작성하기
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {announcements.map(a => (
                                                <div key={a.id} className="flex items-start justify-between gap-3 bg-[var(--moca-surface-2)] rounded-xl px-4 py-3 border border-[var(--moca-border)]">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[var(--moca-text)] font-bold text-sm truncate">{a.title}</p>
                                                        <p className="text-[var(--moca-text-3)] text-xs mt-0.5">{new Date(a.created_at).toLocaleDateString('ko-KR')}</p>
                                                    </div>
                                                    <div className="flex gap-1.5 shrink-0 items-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const shareUrl = `https://immoca.kr/home/message?id=${a.id}`;
                                                                navigator.clipboard.writeText(shareUrl);
                                                                setSuccessMsg(`✅ "${a.title}" 팝업 연결 링크가 복사되었습니다!`);
                                                                setTimeout(() => setSuccessMsg(''), 4000);
                                                            }}
                                                            className="px-2.5 py-1.5 rounded-lg bg-[var(--moca-primary-lt)] hover:bg-[var(--moca-primary)]/20 text-[var(--moca-accent)] text-xs font-bold transition-colors flex items-center gap-1 border border-[var(--moca-primary)]/30"
                                                            title="팝업 연결용 링크 복사"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">share</span>
                                                            <span>링크 복사</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditStart(a)}
                                                            className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                                                            title="수정"
                                                        >
                                                            <span className="material-symbols-outlined text-blue-400 text-[18px]">edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                            title="삭제"
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
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">메세지 제목</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => { setEditTitle(e.target.value); setError(''); }}
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">본문 내용</label>
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => { setEditContent(e.target.value); setError(''); }}
                                            rows={8}
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors resize-none leading-relaxed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">사진 관리 (추가 / 변경 / 삭제)</label>
                                        {editingAnnouncement.image_url && (
                                            <div className="mb-3 p-3 rounded-xl border border-[var(--moca-border)] bg-[var(--moca-surface-2)] flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={editingAnnouncement.image_url} alt="현재 등록된 사진" className="w-16 h-16 object-cover rounded-lg border border-[var(--moca-border)]" />
                                                    <div>
                                                        <p className="text-xs font-bold text-[var(--moca-text)]">현재 등록된 사진</p>
                                                        {removeExistingImage ? (
                                                            <p className="text-xs text-red-400 font-bold mt-1">⚠️ 저장 시 이 사진이 삭제됩니다</p>
                                                        ) : (
                                                            <p className="text-[11px] text-[var(--moca-text-3)] mt-0.5">등록된 사진을 삭제하거나 교체할 수 있습니다.</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {removeExistingImage ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveExistingImage(false)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--moca-primary-lt)] text-[var(--moca-accent)] hover:bg-[var(--moca-primary)]/20 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">undo</span>
                                                        삭제 취소
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRemoveExistingImage(true);
                                                            setEditImage(null);
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        사진 삭제
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-xs font-bold text-[var(--moca-text-2)] mb-1">
                                            {editingAnnouncement.image_url ? (removeExistingImage ? '새 사진으로 교체하기 (선택)' : '사진 교체하기 (선택)') : '사진 등록하기 (선택)'}
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setEditImage(e.target.files[0]);
                                                    setRemoveExistingImage(false);
                                                }
                                            }}
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[var(--moca-primary-lt)] file:text-[var(--moca-accent)] hover:file:bg-[var(--moca-primary)]/20"
                                        />
                                        {editImage && <p className="text-xs text-green-400 mt-2 font-bold">✨ 업로드할 사진: {editImage.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">연결 링크 (선택)</label>
                                        <input
                                            type="url"
                                            value={editLinkUrl}
                                            onChange={(e) => { setEditLinkUrl(e.target.value); setError(''); }}
                                            placeholder="https://example.com"
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                        />
                                    </div>

                                    {/* 공지 글 꾸미기 & 타이포그래피 설정 (수정) */}
                                    <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)] space-y-4">
                                        <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-1">
                                            🎨 공지사항 글 꾸미기 & 타이포그래피
                                        </h2>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">공지 글꼴</label>
                                            <select
                                                value={editFontFamily}
                                                onChange={(e) => setEditFontFamily(e.target.value)}
                                                className="w-full bg-white border border-[var(--moca-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)]"
                                            >
                                                {FONT_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">제목 크기</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {FONT_SIZE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setEditFontSize(opt.id)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                            editFontSize === opt.id
                                                                ? 'bg-[var(--moca-primary)] text-white border-[var(--moca-primary)] shadow-sm'
                                                                : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">포인트 컬러 테마</label>
                                            <div className="flex flex-wrap gap-2">
                                                {GRADIENT_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setEditHighlightGradient(opt.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                                            editHighlightGradient === opt.id
                                                                ? 'ring-2 ring-[var(--moca-primary)] border-transparent bg-white shadow-sm'
                                                                : 'bg-white border-[var(--moca-border)] hover:opacity-80'
                                                        }`}
                                                    >
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full inline-block shadow-inner"
                                                            style={{ background: `linear-gradient(135deg, ${opt.from}, ${opt.to})` }}
                                                        />
                                                        <span>{opt.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">제목 강조 효과</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {HIGHLIGHT_STYLE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setEditHighlightStyle(opt.id)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                            editHighlightStyle === opt.id
                                                                ? 'bg-[var(--moca-text)] text-white border-[var(--moca-text)] shadow-sm'
                                                                : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* 수정 미리보기 */}
                                    {(() => {
                                        const curFont = FONT_OPTIONS.find(f => f.id === editFontFamily) || FONT_OPTIONS[0];
                                        const curSize = FONT_SIZE_OPTIONS.find(s => s.id === editFontSize) || FONT_SIZE_OPTIONS[1];
                                        const curGrad = GRADIENT_OPTIONS.find(g => g.id === editHighlightGradient) || GRADIENT_OPTIONS[0];
                                        const getHighlight = () => {
                                            if (editHighlightStyle === 'solid') return curGrad.text;
                                            if (editHighlightStyle === 'underline') return `${curGrad.text} underline underline-offset-4 decoration-4`;
                                            if (editHighlightStyle === 'glow') return `text-transparent bg-clip-text bg-gradient-to-r ${curGrad.style} drop-shadow-[0_2px_10px_rgba(147,51,234,0.4)]`;
                                            return `text-transparent bg-clip-text bg-gradient-to-r ${curGrad.style}`;
                                        };
                                        return (
                                            <div className="p-4 bg-white border border-[var(--moca-border)] rounded-2xl shadow-sm space-y-2">
                                                <span className="text-[10px] font-black text-[#9333EA] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">수정 미리보기</span>
                                                <h3
                                                    className={`${curSize.heroClass} font-black text-[#1F1235] leading-snug`}
                                                    style={{ fontFamily: curFont.family }}
                                                >
                                                    <span className={`inline-block ${getHighlight()}`}>
                                                        {editTitle || '공지 제목 미리보기'}
                                                    </span>
                                                </h3>
                                                <p
                                                    className="text-[#5B4E7A] text-xs leading-relaxed whitespace-pre-wrap font-medium"
                                                    style={{ fontFamily: curFont.family }}
                                                >
                                                    {editContent || '본문 내용 스타일 미리보기'}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setLoungeView('list')}
                                            className="flex-1 py-4 rounded-xl border border-[var(--moca-border)] text-[var(--moca-text-2)] font-bold text-sm hover:bg-[var(--moca-primary-lt)] transition-colors"
                                        >취소</button>
                                        <button
                                            type="submit"
                                            disabled={isUpdating || !editTitle.trim() || !editContent.trim()}
                                            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[var(--moca-accent)] to-[var(--moca-primary)] text-black font-black text-sm disabled:opacity-50 flex justify-center items-center gap-2"
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
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">메세지 제목</label>
                                        <input
                                            type="text"
                                            value={announcementTitle}
                                            onChange={(e) => { setAnnouncementTitle(e.target.value); setError(''); }}
                                            placeholder="예: [안내] 이번주 MOCA 오프라인 모임"
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">사진 첨부 (선택)</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setAnnouncementImage(e.target.files[0]);
                                                }
                                            }}
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[var(--moca-primary-lt)] file:text-[var(--moca-accent)] hover:file:bg-[var(--moca-primary)]/20"
                                        />
                                        {announcementImage && (
                                            <p className="text-xs text-green-400 mt-2">선택된 파일: {announcementImage.name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">본문 내용</label>
                                        <textarea
                                            value={announcementContent}
                                            onChange={(e) => { setAnnouncementContent(e.target.value); setError(''); }}
                                            placeholder="어떤 소식을 전하고 싶으신가요?"
                                            rows={8}
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors resize-none leading-relaxed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">연결 링크 (선택)</label>
                                        <input
                                            type="url"
                                            value={announcementLinkUrl}
                                            onChange={(e) => { setAnnouncementLinkUrl(e.target.value); setError(''); }}
                                            placeholder="https://example.com"
                                            className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                        />
                                    </div>

                                    {/* 공지 글 꾸미기 & 타이포그래피 설정 (작성) */}
                                    <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)] space-y-4">
                                        <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-1">
                                            🎨 공지사항 글 꾸미기 & 타이포그래피
                                        </h2>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">공지 글꼴</label>
                                            <select
                                                value={noticeFontFamily}
                                                onChange={(e) => setNoticeFontFamily(e.target.value)}
                                                className="w-full bg-white border border-[var(--moca-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)]"
                                            >
                                                {FONT_OPTIONS.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">제목 크기</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {FONT_SIZE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setNoticeFontSize(opt.id)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                            noticeFontSize === opt.id
                                                                ? 'bg-[var(--moca-primary)] text-white border-[var(--moca-primary)] shadow-sm'
                                                                : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">포인트 컬러 테마</label>
                                            <div className="flex flex-wrap gap-2">
                                                {GRADIENT_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setNoticeHighlightGradient(opt.id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                                            noticeHighlightGradient === opt.id
                                                                ? 'ring-2 ring-[var(--moca-primary)] border-transparent bg-white shadow-sm'
                                                                : 'bg-white border-[var(--moca-border)] hover:opacity-80'
                                                        }`}
                                                    >
                                                        <span
                                                            className="w-3.5 h-3.5 rounded-full inline-block shadow-inner"
                                                            style={{ background: `linear-gradient(135deg, ${opt.from}, ${opt.to})` }}
                                                        />
                                                        <span>{opt.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">제목 강조 효과</label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {HIGHLIGHT_STYLE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => setNoticeHighlightStyle(opt.id)}
                                                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                            noticeHighlightStyle === opt.id
                                                                ? 'bg-[var(--moca-text)] text-white border-[var(--moca-text)] shadow-sm'
                                                                : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    {/* 작성 미리보기 */}
                                    {(() => {
                                        const curFont = FONT_OPTIONS.find(f => f.id === noticeFontFamily) || FONT_OPTIONS[0];
                                        const curSize = FONT_SIZE_OPTIONS.find(s => s.id === noticeFontSize) || FONT_SIZE_OPTIONS[1];
                                        const curGrad = GRADIENT_OPTIONS.find(g => g.id === noticeHighlightGradient) || GRADIENT_OPTIONS[0];
                                        const getHighlight = () => {
                                            if (noticeHighlightStyle === 'solid') return curGrad.text;
                                            if (noticeHighlightStyle === 'underline') return `${curGrad.text} underline underline-offset-4 decoration-4`;
                                            if (noticeHighlightStyle === 'glow') return `text-transparent bg-clip-text bg-gradient-to-r ${curGrad.style} drop-shadow-[0_2px_10px_rgba(147,51,234,0.4)]`;
                                            return `text-transparent bg-clip-text bg-gradient-to-r ${curGrad.style}`;
                                        };
                                        return (
                                            <div className="p-4 bg-white border border-[var(--moca-border)] rounded-2xl shadow-sm space-y-2">
                                                <span className="text-[10px] font-black text-[#9333EA] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">작성 미리보기</span>
                                                <h3
                                                    className={`${curSize.heroClass} font-black text-[#1F1235] leading-snug`}
                                                    style={{ fontFamily: curFont.family }}
                                                >
                                                    <span className={`inline-block ${getHighlight()}`}>
                                                        {announcementTitle || '공지 제목 미리보기'}
                                                    </span>
                                                </h3>
                                                <p
                                                    className="text-[#5B4E7A] text-xs leading-relaxed whitespace-pre-wrap font-medium"
                                                    style={{ fontFamily: curFont.family }}
                                                >
                                                    {announcementContent || '어떤 소식을 전하고 싶으신가요? 글꼴과 테마가 반영되어 표시됩니다.'}
                                                </p>
                                            </div>
                                        );
                                    })()}

                                    <button
                                        type="submit"
                                        disabled={isPosting || !announcementTitle.trim() || !announcementContent.trim()}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--moca-accent)] to-[var(--moca-primary)] text-black font-black text-[16px] shadow-lg shadow-[var(--moca-primary)]/20 hover:scale-[1.02] hover:shadow-[var(--moca-primary)]/30 transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
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

                {activeTab === 'homepage' && (
                    <AdminHomepage
                        setSuccessMsg={setSuccessMsg}
                        setError={setError}
                    />
                )}

                {/* ============================================================ */}
                {/* 🔔 푸시 발송 내역 탭 */}
                {/* ============================================================ */}
                {activeTab === 'pushhistory' && (() => {
                    // 푸시 프리셋 적용
                    const applyPushPreset = (preset) => {
                        const presets = {
                            agency: { title: '📍 에이전시 주소 업데이트!', body: '에이전시 주소가 업데이트되었습니다. 지금 확인해보세요!', route: '/agencies' },
                            class: { title: '🆕 새로운 모카 클래스 오픈!', body: '새 클래스가 오픈되었습니다. 지금 바로 확인해보세요!', route: '/home/class' },
                            notice: { title: '📢 모카 공지사항', body: '중요한 공지사항이 있습니다. 앱에서 확인해주세요.', route: '/home/dashboard' },
                            mocatv: { title: '🎬 모카TV 김대표님 영상 업로드!', body: '모카TV에 김대표님의 새로운 영상이 업로드 되었습니다. 지금 바로 확인해 보세요!', route: '/home/tv' },
                        };
                        if (presets[preset]) setPushForm(presets[preset]);
                    };
                    const handleSendPush = async () => {
                        if (!pushForm.title.trim() || !pushForm.body.trim()) return;
                        setIsSendingPush(true);
                        setPushResult(null);
                        setPushConfirmOpen(false);
                        const result = await sendBroadcastPush(pushForm);
                        setPushResult(result);
                        setIsSendingPush(false);
                        // 발송 후 내역 새로고침
                        const { data } = await fetchPushHistory(10);
                        setPushHistory(data || []);
                    };
                    const handleSendMsg = async () => {
                        let targets = [];
                        if (msgForm.target === 'noapp') {
                            targets = noAppUsers;
                        } else if (msgForm.target === 'nopermission') {
                            targets = noPermissionUsers;
                        } else if (msgForm.target === 'nopush') {
                            targets = noPushUsers;
                        } else {
                            targets = allPhoneUsers;
                        }
                        const phones = targets.map(u => u.phone).filter(Boolean);
                        if (!phones.length) return;
                        setIsSendingEncourage(true);
                        setMsgResult(null);
                        setMsgConfirmOpen(false);
                        try {
                            if (msgForm.type === 'sms') {
                                await sendBulkMessage(phones, msgForm.content);
                            } else {
                                await sendFriendtalk(phones.map(phone => ({ phone, content: msgForm.content })));
                            }
                            setMsgResult({ success: true, count: phones.length });
                        } catch (err) {
                            setMsgResult({ success: false, error: err.message || '발송에 실패했습니다.' });
                        }
                        setIsSendingEncourage(false);
                    };
                    const refreshNoPushUsers = async () => {
                        setNoPushLoading(true);
                        const [noPushResult, allPhoneResult] = await Promise.all([
                            fetchUsersWithoutPushToken(),
                            fetchAllUsersWithPhone(),
                        ]);
                        setNoPushUsers(noPushResult.data || []);
                        setNoAppUsers(noPushResult.noAppUsers || []);
                        setNoPermissionUsers(noPushResult.noPermissionUsers || []);
                        setAllPhoneUsers(allPhoneResult.data || []);
                        setNoPushLoading(false);
                    };

                    return (
                    <div className="animate-fadeIn space-y-6">

                        {/* ── 푸시 알림 확인 모달 ── */}
                        {pushConfirmOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">🔔</span>
                                        <div>
                                            <h3 className="font-black text-[var(--moca-text)] text-lg">푸시 알림 발송 확인</h3>
                                            <p className="text-xs text-[var(--moca-text-3)]">전체 사용자에게 즉시 발송됩니다</p>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--moca-bg)] rounded-xl p-4 mb-5 space-y-2">
                                        <p className="text-sm font-bold text-[var(--moca-text)]">제목: {pushForm.title}</p>
                                        <p className="text-sm text-[var(--moca-text-2)]">내용: {pushForm.body}</p>
                                        <p className="text-xs text-[var(--moca-text-3)]">이동 경로: {pushForm.route}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setPushConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--moca-border)] text-[var(--moca-text-2)] font-bold text-sm hover:bg-[var(--moca-bg)] transition-colors">취소</button>
                                        <button onClick={handleSendPush} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--moca-primary)] to-purple-600 text-white font-black text-sm hover:opacity-90 transition-all">발송하기</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 독려 메시지 확인 모달 ── */}
                        {msgConfirmOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">📲</span>
                                        <div>
                                            <h3 className="font-black text-[var(--moca-text)] text-lg">메시지 발송 확인</h3>
                                            <p className="text-xs text-[var(--moca-text-3)]">
                                                {msgForm.target === 'noapp' ? `앱 미설치 회원 ${noAppUsers.length}명` :
                                                 msgForm.target === 'nopermission' ? `알림 미승인 회원 ${noPermissionUsers.length}명` :
                                                 msgForm.target === 'nopush' ? `푸시 미수신 전체 ${noPushUsers.length}명` :
                                                 `전체 회원 ${allPhoneUsers.length}명`}에게 즉시 발송됩니다
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--moca-bg)] rounded-xl p-3 mb-5 text-xs text-[var(--moca-text-2)] whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{msgForm.content}</div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setMsgConfirmOpen(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--moca-border)] text-[var(--moca-text-2)] font-bold text-sm hover:bg-[var(--moca-bg)] transition-colors">취소</button>
                                        <button onClick={handleSendMsg} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm hover:opacity-90 transition-all">발송하기</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 서브탭 ── */}
                        <div className="flex gap-2 border-b border-[var(--moca-border)] pb-0">
                            {[
                                { key: 'push', label: '🔔 앱 푸시 알림', color: 'border-purple-500 text-purple-700 bg-purple-50' },
                                { key: 'encourage', label: '📲 앱 설치 독려 문자', color: 'border-orange-500 text-orange-700 bg-orange-50' },
                                { key: 'history', label: '📋 발송 내역', color: 'border-red-500 text-red-700 bg-red-50' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setNotifSubTab(tab.key)}
                                    className={`pb-3 px-4 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${
                                        notifSubTab === tab.key ? tab.color : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                                    }`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* ────── 서브탭: 앱 푸시 알림 ────── */}
                        {notifSubTab === 'push' && (
                            <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6 border-b border-[var(--moca-border)] pb-4">
                                    <span className="text-3xl">🔔</span>
                                    <div>
                                        <h2 className="text-xl font-black text-[var(--moca-text)]">앱 푸시 알림 발송</h2>
                                        <p className="text-sm text-[var(--moca-text-3)] mt-0.5">앱을 설치한 전체 사용자에게 즉시 푸시 알림을 보냅니다.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-5">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">⚡ 빠른 프리셋</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { key: 'agency', label: '📍 에이전시 업데이트', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                                                    { key: 'class', label: '🆕 클래스 오픈', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                                                    { key: 'notice', label: '📢 공지사항', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                                                    { key: 'mocatv', label: '🎬 모카TV 김대표님 영상', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
                                                ].map(p => (
                                                    <button key={p.key} onClick={() => applyPushPreset(p.key)} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${p.color}`}>{p.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">알림 제목 <span className="text-red-400">*</span></label>
                                            <input type="text" value={pushForm.title} onChange={e => setPushForm(p => ({ ...p, title: e.target.value }))} placeholder="📍 에이전시 주소 업데이트!" maxLength={50}
                                                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors" />
                                            <p className="text-right text-[10px] text-[var(--moca-text-3)] mt-1">{pushForm.title.length}/50</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">알림 내용 <span className="text-red-400">*</span></label>
                                            <textarea value={pushForm.body} onChange={e => setPushForm(p => ({ ...p, body: e.target.value }))} placeholder="에이전시 주소가 업데이트되었습니다. 지금 확인해보세요!" maxLength={100} rows={3}
                                                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors resize-none" />
                                            <p className="text-right text-[10px] text-[var(--moca-text-3)] mt-1">{pushForm.body.length}/100</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">탭 시 이동 경로</label>
                                            <div className="flex gap-2">
                                                {['/agencies', '/home/class', '/home/tv', '/home/dashboard'].map(r => (
                                                    <button key={r} onClick={() => setPushForm(p => ({ ...p, route: r }))}
                                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                                            pushForm.route === r ? 'bg-[var(--moca-primary)] text-white border-[var(--moca-primary)]' : 'bg-[var(--moca-bg)] text-[var(--moca-text-2)] border-[var(--moca-border)] hover:border-[var(--moca-primary)]'
                                                        }`}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => { if (!pushForm.title.trim() || !pushForm.body.trim()) return; setPushConfirmOpen(true); setPushResult(null); }}
                                            disabled={isSendingPush || !pushForm.title.trim() || !pushForm.body.trim()}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--moca-primary)] to-purple-600 text-white font-black text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {isSendingPush ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 발송 중...</> : <><span className="material-symbols-outlined text-[18px]">send</span> 전체 사용자에게 발송</>}
                                        </button>
                                        {pushResult && (
                                            <div className={`rounded-xl p-4 text-sm font-bold flex items-start gap-3 ${pushResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                <span className="text-xl">{pushResult.success ? '✅' : '❌'}</span>
                                                <div>
                                                    {pushResult.success ? <><p>푸시 알림 발송 완료!</p><p className="text-xs font-normal mt-1 opacity-80">성공 {pushResult.successCount}건 / 실패 {pushResult.failCount}건</p></> : <><p>발송 실패</p><p className="text-xs font-normal mt-1 opacity-80">{pushResult.error}</p></>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[var(--moca-text-2)] mb-3">👁️ 알림 미리보기</p>
                                        <div className="bg-gray-900 rounded-2xl p-4 shadow-xl">
                                            <div className="flex justify-between items-center mb-4 px-1">
                                                <span className="text-white text-xs font-bold">9:41</span>
                                                <div className="flex gap-1 items-center">
                                                    <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                                                    <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                                                    <div className="w-3 h-1.5 bg-white rounded-sm" />
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-base flex-shrink-0">🔔</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-white text-xs font-black truncate">모두의 캐스팅 모카</span>
                                                            <span className="text-white/50 text-[10px] ml-2 flex-shrink-0">지금</span>
                                                        </div>
                                                        <p className="text-white text-xs font-bold leading-snug truncate">{pushForm.title || '알림 제목을 입력하세요'}</p>
                                                        <p className="text-white/70 text-[11px] leading-snug mt-0.5 line-clamp-2">{pushForm.body || '알림 내용을 입력하세요'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-center text-white/30 text-[10px] mt-3">Android 알림 미리보기</p>
                                        </div>
                                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <p className="text-xs font-bold text-amber-700 mb-1">⚠️ 발송 전 확인</p>
                                            <ul className="text-[11px] text-amber-600 space-y-1 list-disc list-inside">
                                                <li>전체 앱 사용자에게 즉시 발송됩니다</li>
                                                <li>발송 후 취소가 불가능합니다</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ────── 서브탭: 앱 설치 독려 메시지 ────── */}
                        {notifSubTab === 'encourage' && (
                            <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6 border-b border-[var(--moca-border)] pb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📲</span>
                                        <div>
                                            <h2 className="text-xl font-black text-[var(--moca-text)]">앱 설치 독려 메시지</h2>
                                            <p className="text-sm text-[var(--moca-text-3)] mt-0.5">앱 미설치 회원에게 문자(SMS) 또는 카카오 친구톡으로 안내합니다.</p>
                                        </div>
                                    </div>
                                    <button onClick={refreshNoPushUsers} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-xs font-bold text-[var(--moca-text-2)] hover:bg-gray-100 transition-all">
                                        <span className="material-symbols-outlined text-[14px]">refresh</span> 새로고침
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-center">
                                        <p className="text-xl font-black text-blue-700">{noPushLoading ? '…' : allPhoneUsers.length}</p>
                                        <p className="text-[10px] text-blue-500 font-bold mt-1">전체 회원</p>
                                    </div>
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
                                        <p className="text-xl font-black text-green-700">{noPushLoading ? '…' : allPhoneUsers.length - noPushUsers.length}</p>
                                        <p className="text-[10px] text-green-500 font-bold mt-1">푸시 정상</p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
                                        <p className="text-xl font-black text-orange-700">{noPushLoading ? '…' : noAppUsers.length}</p>
                                        <p className="text-[10px] text-orange-500 font-bold mt-1">앱 미설치</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
                                        <p className="text-xl font-black text-red-700">{noPushLoading ? '…' : noPermissionUsers.length}</p>
                                        <p className="text-[10px] text-red-500 font-bold mt-1">알림 미승인</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">📡 발송 방법</p>
                                            <div className="flex gap-2">
                                                {[{ key: 'sms', label: '📱 SMS 문자' }, { key: 'friendtalk', label: '💬 카카오 친구톡' }].map(t => (
                                                    <button key={t.key} onClick={() => setMsgForm(f => ({ ...f, type: t.key }))}
                                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                            msgForm.type === t.key ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-[var(--moca-bg)] text-[var(--moca-text-2)] border-[var(--moca-border)] hover:border-orange-300'
                                                        }`}>{t.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">👥 발송 대상</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { key: 'noapp', label: `앱 미설치 (${noAppUsers.length}명)`, color: 'bg-orange-500' },
                                                    { key: 'nopermission', label: `알림 미승인 (${noPermissionUsers.length}명)`, color: 'bg-red-500' },
                                                    { key: 'nopush', label: `전체 미등록 (${noPushUsers.length}명)`, color: 'bg-gray-700' },
                                                    { key: 'all', label: `전체 회원 (${allPhoneUsers.length}명)`, color: 'bg-blue-500' },
                                                ].map(t => (
                                                    <button key={t.key} onClick={() => {
                                                        let defaultContent = DEFAULT_INSTALL_MSG;
                                                        if (t.key === 'nopermission') {
                                                            defaultContent = DEFAULT_PERMISSION_MSG;
                                                        }
                                                        setMsgForm(f => ({ ...f, target: t.key, content: defaultContent }));
                                                    }}
                                                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                                                            msgForm.target === t.key ? `${t.color} text-white border-transparent shadow-sm` : 'bg-[var(--moca-bg)] text-[var(--moca-text-2)] border-[var(--moca-border)] hover:border-gray-400'
                                                        }`}>{t.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-bold text-[var(--moca-text-2)]">✍️ 메시지 내용</p>
                                                <button onClick={() => setMsgForm(f => ({ ...f, content: msgForm.target === 'nopermission' ? DEFAULT_PERMISSION_MSG : DEFAULT_INSTALL_MSG }))} className="text-[10px] text-orange-500 font-bold hover:underline">기본 문구 복원</button>
                                            </div>
                                            <textarea value={msgForm.content} onChange={e => setMsgForm(f => ({ ...f, content: e.target.value }))} rows={6}
                                                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm text-[var(--moca-text)] focus:outline-none focus:border-orange-400 transition-colors resize-none" />
                                            <p className="text-right text-[10px] text-[var(--moca-text-3)] mt-1">{msgForm.content.length}자</p>
                                        </div>
                                        <button onClick={() => { if (msgForm.content.trim()) setMsgConfirmOpen(true); }}
                                            disabled={isSendingEncourage || !msgForm.content.trim() || (
                                                msgForm.target === 'noapp' ? noAppUsers.length === 0 :
                                                msgForm.target === 'nopermission' ? noPermissionUsers.length === 0 :
                                                msgForm.target === 'nopush' ? noPushUsers.length === 0 :
                                                allPhoneUsers.length === 0
                                            )}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm shadow-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            {isSendingEncourage ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 발송 중...</> : <><span className="material-symbols-outlined text-[18px]">send</span>{
                                                msgForm.target === 'noapp' ? `앱 미설치 ${noAppUsers.length}명에게 발송` :
                                                msgForm.target === 'nopermission' ? `알림 미승인 ${noPermissionUsers.length}명에게 발송` :
                                                msgForm.target === 'nopush' ? `푸시 미수신 ${noPushUsers.length}명에게 발송` :
                                                `전체 ${allPhoneUsers.length}명에게 발송`
                                            }</>}
                                        </button>
                                        {msgResult && (
                                            <div className={`rounded-xl p-4 text-sm font-bold flex items-start gap-3 ${msgResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                <span className="text-xl">{msgResult.success ? '✅' : '❌'}</span>
                                                <div>
                                                    {msgResult.success ? <><p>메시지 발송 완료!</p><p className="text-xs font-normal mt-1 opacity-80">{msgResult.count}명에게 발송되었습니다.</p></> : <><p>발송 실패</p><p className="text-xs font-normal mt-1 opacity-80">{msgResult.error}</p></>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs font-bold text-[var(--moca-text-2)] mb-3">👁️ 메시지 미리보기</p>
                                            <div className="bg-gray-100 rounded-2xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0">모카</div>
                                                    <div className="flex-1 bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                                        <p className="text-[11px] font-black text-gray-700 mb-1">{msgForm.type === 'sms' ? '📱 문자 메시지' : '💬 카카오 친구톡'}</p>
                                                        <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{msgForm.content || '메시지를 입력하세요'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                            <p className="text-xs font-black text-amber-700 mb-2">⚠️ 발송 전 확인사항</p>
                                            <ul className="text-[11px] text-amber-600 space-y-1.5 list-disc list-inside">
                                                <li>솔라피 서비스를 통해 발송되므로 <strong>발송 비용</strong>이 발생합니다</li>
                                                <li>SMS: 건당 약 8~20원 / 카카오 친구톡: 건당 약 15원</li>
                                                <li>마케팅 정보 수신 동의 여부를 확인 후 발송하세요</li>
                                                <li>발송 후 취소가 불가능합니다</li>
                                            </ul>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <p className="text-xs font-black text-blue-700 mb-2">📥 앱 다운로드 링크</p>
                                            <a href="https://play.google.com/store/apps/details?id=com.immodel.mocapp" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 underline break-all leading-relaxed">
                                                https://play.google.com/store/apps/details?id=com.immodel.mocapp
                                            </a>
                                            <p className="text-[10px] text-blue-500 mt-1">구글플레이 검색어: <strong>'모두의 캐스팅'</strong></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ────── 서브탭: 발송 내역 ────── */}
                        {notifSubTab === 'history' && (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📋</span>
                                        <div>
                                            <h2 className="text-xl font-black text-[var(--moca-text)]">푸시 알림 발송 내역</h2>
                                            <p className="text-sm text-[var(--moca-text-3)] mt-0.5">최근 발송된 푸시 알림 이력입니다. (최대 10건)</p>
                                        </div>
                                    </div>
                                    <button onClick={async () => { setPushHistoryLoading(true); const { data } = await fetchPushHistory(10); setPushHistory(data || []); setPushHistoryLoading(false); }}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--moca-surface-2)] hover:bg-red-50 border border-[var(--moca-border)] text-sm font-bold transition-all">
                                        <span className="material-symbols-outlined text-[16px]">refresh</span> 새로고침
                                    </button>
                                </div>
                                {pushHistoryLoading ? (
                                    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /></div>
                                ) : pushHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <span className="material-symbols-outlined text-[48px] mb-3">notifications_off</span>
                                        <p className="font-bold">아직 발송된 푸시 알림이 없습니다.</p>
                                        <p className="text-sm mt-1">앱 푸시 알림 탭에서 알림을 발송해 보세요.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pushHistory.map((item, idx) => {
                                            const senderLabel = {
                                                admin_custom: '👤 관리자 수동',
                                                system_classes: '🎓 시스템 (클래스)',
                                                system_partners: '🏢 시스템 (제휴)',
                                                system_moca_featured_videos: '🎬 시스템 (모카TV)',
                                            }[item.sender] || `⚙️ ${item.sender}`;
                                            const sentAt = new Date(item.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <div key={item.id} className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black text-sm">{idx + 1}</div>
                                                        <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">{senderLabel}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-[var(--moca-text)] text-[14px] truncate">{item.title}</p>
                                                        <p className="text-[var(--moca-text-2)] text-[13px] mt-0.5 line-clamp-1">{item.body}</p>
                                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                            <span className="text-[11px] text-gray-400">🕒 {sentAt}</span>
                                                            <span className="text-[11px] text-gray-400">📍 {item.route}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <span className="text-[12px] font-black bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-lg">✅ {item.success_count}건</span>
                                                        {item.fail_count > 0 && <span className="text-[12px] font-black bg-red-50 text-red-500 border border-red-200 px-2.5 py-1 rounded-lg">❌ {item.fail_count}건</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    );
                })()}

                {activeTab === 'message' && (
                    <div className="animate-fadeIn max-w-2xl mx-auto mt-8">
                        <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-8 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-[var(--moca-border)] pb-4">
                                <span className="material-symbols-outlined text-[#FBBF24] text-3xl">sms</span>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--moca-text)]">단체 메시지 발송</h2>
                                    <p className="text-sm text-[var(--moca-text-3)] mt-1">회원들에게 친구톡 · 알림톡 · 문자를 발송합니다.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSendBulkMessage} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">발송 방식</label>
                                    <select
                                        value={msgType}
                                        onChange={(e) => setMsgType(e.target.value)}
                                        className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                    >
                                        <option value="friendtalk">친구톡 (마케팅 · 자유형식)</option>
                                        <option value="kakao">알림톡 (정보성 · 템플릿 필요)</option>
                                        <option value="sms">일반 문자 (SMS/LMS)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">수신 대상</label>
                                    <select
                                        value={msgTarget}
                                        onChange={(e) => setMsgTarget(e.target.value)}
                                        className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
                                    >
                                        <option value="ALL">전체 회원</option>
                                        {grades.map(g => (
                                            <option key={g} value={g}>{GRADE_EMOJI[g]} {GRADE_INFO[g]?.label || g} 등급 회원</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-[var(--moca-text-3)] mt-2">
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
                                    <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-2">메시지 내용</label>
                                    <textarea
                                        value={msgContent}
                                        onChange={(e) => { setMsgContent(e.target.value); setError(''); }}
                                        placeholder={msgType === 'friendtalk' ? '자유롭게 내용을 입력하세요. (친구톡은 템플릿 불필요, 채널 친구에게 발송 · 비친구는 SMS 자동 대체)' : msgType === 'kakao' ? '사전에 승인된 알림톡 템플릿 내용과 정확히 일치해야 합니다.' : '발송할 문자 내용을 입력하세요.'}
                                        rows={6}
                                        className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSendingMsg || !msgContent.trim()}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-black font-black text-[16px] shadow-lg shadow-amber-500/20 hover:scale-[1.02] hover:shadow-amber-500/30 transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
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


                {activeTab === 'subscriptions' && (
                    <AdminUpgradeRequests setSuccessMsg={setSuccessMsg} setError={setError} />
                )}

                {activeTab === 'classes' && (
                    <AdminClasses />
                )}

                {/* ── 📝 전속계약 관리 탭 ── */}
                {activeTab === 'contracts' && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--moca-text)]">📝 전속계약 관리</h2>
                                <p className="text-[var(--moca-text-3)] text-sm mt-1">전속모델이 서명 제출한 계약서를 검토하고 승인합니다.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-[var(--moca-text-3)]">
                                    총 {allContracts.length}건 · 대기 {contracts.filter(c => c.status === 'pending').length}건 · 미제출 {allContracts.filter(c => c.status === 'no_contract').length}건
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText('https://immoca.kr/contract')
                                            .then(() => {
                                                setSuccessMsg('✅ 계약 초대 링크가 복사되었습니다! 카카오톡 또는 문자로 발송해주세요.');
                                                setTimeout(() => setSuccessMsg(''), 4000);
                                            });
                                    }}
                                    className="flex items-center gap-2 bg-[var(--moca-primary-lt)] hover:bg-[var(--moca-primary)]/20 border border-[var(--moca-primary)]/50 text-[var(--moca-accent)] px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg"
                                >
                                    <span className="material-symbols-outlined text-[18px]">link</span>
                                    계약 초대 링크 복사
                                </button>
                            </div>
                        </div>

                        {selectedContract ? (
                            /* 상세 계약서 뷰 */
                            <div className="bg-white rounded-2xl p-6 sm:p-10 text-gray-800 shadow-2xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-black flex items-center gap-3">
                                        계약서 상세 조회
                                        {selectedContract.status !== 'no_contract' && (
                                            <button 
                                                onClick={() => setIsContractViewerOpen(true)}
                                                className="ml-4 text-xs bg-[var(--moca-primary-lt)] text-[var(--moca-primary)] border border-[var(--moca-primary)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--moca-primary)]/15 transition-colors"
                                            >
                                                📄 계약서 전문 보기
                                            </button>
                                        )}
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
                                    <div><span className="font-bold text-gray-500">서명일:</span> {selectedContract.sign_date}</div>
                                    <div><span className="font-bold text-gray-500">제출일시:</span> {selectedContract.status === 'no_contract' ? '미제출' : new Date(selectedContract.created_at).toLocaleString('ko-KR')}</div>
                                    <div><span className="font-bold text-gray-500">현재 상태:</span> <span className={`font-black ${selectedContract.status === 'approved' ? 'text-green-600' : (selectedContract.status === 'rejected' || selectedContract.status === 'no_contract') ? 'text-red-500' : 'text-yellow-600'}`}>{selectedContract.status === 'approved' ? '✅ 승인완료' : selectedContract.status === 'rejected' ? '❌ 반려' : selectedContract.status === 'no_contract' ? '❌ 서명 미제출' : '⏳ 검토 대기'}</span></div>
                                </div>
                                {selectedContract.signature_image && (
                                    <div className="mb-6">
                                        <p className="font-bold text-gray-500 mb-2">모델 서명:</p>
                                        <div className="border-2 border-gray-300 rounded-lg p-3 inline-block bg-gray-50">
                                            <img src={selectedContract.signature_image} alt="서명" className="max-h-24" />
                                        </div>
                                    </div>
                                )}
                                {selectedContract.status === 'no_contract' && (
                                    <div className="mt-6 p-6 bg-red-50 rounded-xl border border-red-200 text-center">
                                        <p className="text-red-700 font-bold mb-3 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">warning</span>
                                            아직 전속계약서 서명이 제출되지 않았습니다.
                                        </p>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText('https://immoca.kr/contract')
                                                    .then(() => {
                                                        setSuccessMsg('✅ 계약 초대 링크가 복사되었습니다! 카카오톡 또는 문자로 발송해주세요.');
                                                        setTimeout(() => setSuccessMsg(''), 4000);
                                                    });
                                            }}
                                            className="inline-flex items-center gap-2 bg-[var(--moca-primary)] hover:bg-[var(--moca-primary)]/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">link</span>
                                            계약 초대 링크 복사
                                        </button>
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
                            allContracts.length === 0 ? (
                                <div className="text-center py-20 text-[var(--moca-text-3)]">
                                    <span className="material-symbols-outlined text-6xl mb-4 block">contract</span>
                                    <p className="font-bold">제출된 계약서가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {allContracts.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => setSelectedContract(c)}
                                            className="bg-[var(--moca-surface-2)] hover:bg-[var(--moca-primary-lt)] border border-[var(--moca-border)] rounded-2xl px-5 py-4 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                                    c.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                                    c.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                    c.status === 'no_contract' ? 'bg-gray-500/20 text-gray-400' :
                                                    'bg-yellow-500/20 text-yellow-300'
                                                }`}>
                                                    {c.status === 'approved' ? '✅' : c.status === 'rejected' ? '❌' : c.status === 'no_contract' ? '📝' : '⏳'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-[var(--moca-text)] text-base">{c.member_name}</p>
                                                    <p className="text-[var(--moca-text-3)] text-xs">{c.member_phone} · 계약기간: {c.start_date} ~ {c.end_date}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[var(--moca-text-2)] text-xs">{c.status === 'no_contract' ? '가입일' : new Date(c.created_at).toLocaleDateString('ko-KR')} {c.status === 'no_contract' ? '' : '제출'}</p>
                                                    <p className={`text-xs font-black mt-0.5 ${
                                                        c.status === 'approved' ? 'text-green-400' :
                                                        c.status === 'rejected' ? 'text-red-400' :
                                                        c.status === 'no_contract' ? 'text-red-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                        {c.status === 'approved' ? '승인완료' : c.status === 'rejected' ? '반려됨' : c.status === 'no_contract' ? '서명 미제출' : '검토 대기 중'}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-[var(--moca-text-3)] group-hover:text-[var(--moca-text-2)] transition-colors">chevron_right</span>
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
                                        <h3 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2">
                                            🏆 MOCA BEST PICK
                                        </h3>
                                        <p className="text-[var(--moca-text-3)] text-xs mt-0.5">{now.getMonth() + 1}월 좋아요 순 자동 집계</p>
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
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white text-xs font-black shadow-lg shadow-purple-900/20 border border-purple-400/40 transition-all hover:scale-[1.02] shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-[16px] text-yellow-300">send</span>
                                            <span className="text-white font-black">Top 3 전원 모카베스트 PICK + 알림톡 발송</span>
                                        </button>
                                    )}
                                </div>

                                {top3.length === 0 ? (
                                    <p className="text-[var(--moca-text-3)] text-sm text-center py-6">이번 달 업로드된 인증샷이 없습니다.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {top3.map((post, idx) => {
                                            const medals = ['🥇', '🥈', '🥉'];
                                            const rankColors = [
                                                'border-yellow-500/50 bg-yellow-500/10',
                                                'border-slate-400/40 bg-slate-400/10',
                                                'border-orange-500/40 bg-orange-500/10',
                                            ];
                                            const imgs = parseImageUrls(post.image_url);
                                            const imgUrl = imgs.length > 0 && typeof imgs[0] === 'string' ? imgs[0] : null;

                                            return (
                                                <div key={post.id} className={`border rounded-2xl overflow-hidden ${rankColors[idx]} transition-all duration-300 hover:scale-[1.01]`}>
                                                    <div className="relative aspect-square bg-slate-100/50 flex items-center justify-center overflow-hidden">
                                                        {imgUrl ? (
                                                            <img
                                                                src={imgUrl}
                                                                alt={post.user_nickname || ''}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    if (e.currentTarget.nextSibling) {
                                                                        e.currentTarget.nextSibling.style.display = 'flex';
                                                                    }
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div
                                                            className="flex flex-col items-center gap-1 text-[var(--moca-text-3)]"
                                                            style={{ display: imgUrl ? 'none' : 'flex' }}
                                                        >
                                                            <span className="material-symbols-outlined text-3xl">image</span>
                                                            <span className="text-[10px] font-bold">사진 없음</span>
                                                        </div>
                                                        <div className="absolute top-2 left-2 text-2xl drop-shadow-md">{medals[idx]}</div>
                                                    </div>
                                                    <div className="p-3 bg-white/70 backdrop-blur-xs">
                                                        <p className="text-[var(--moca-text)] font-black text-sm truncate">{post.user_nickname || '회원'}</p>
                                                        <p className="text-[var(--moca-text-2)] text-xs font-bold mt-0.5">❤️ {post.likes_count || 0} · {post.activity_type || '인증샷'}</p>
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
                                    <h3 className="text-lg font-black text-[var(--moca-text)]">📸 전체 투어 인증샷 관리</h3>
                                    <p className="text-[var(--moca-text-3)] text-sm mt-0.5">HOT 배지 부여 · 모카베스트 PICK 선정 · 카페 포스팅 · 삭제</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCertFilter('all')}
                                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${certFilter === 'all'
                                            ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300'
                                            : 'bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-2)]'}`}
                                    >전체</button>
                                    <button
                                        onClick={() => setCertFilter('pick')}
                                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${certFilter === 'pick'
                                            ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                                            : 'bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-2)]'}`}
                                    >👑 모카베스트 PICK만</button>
                                </div>
                            </div>

                            {certLoading ? (
                                <div className="flex justify-center py-12">
                                    <span className="material-symbols-outlined text-[var(--moca-text-3)] text-[40px] animate-spin">progress_activity</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {certPosts
                                        .filter(p => certFilter === 'pick' ? p.is_marketing_pick : true)
                                        .map(post => (
                                            <div key={post.id} className="bg-white border border-[var(--moca-border)] rounded-2xl overflow-hidden">
                                                <div className="relative w-full aspect-square bg-black/30">
                                                    {(() => {
                                                        const imgs = parseImageUrls(post.image_url);
                                                        return (
                                                            <>
                                                                <img src={imgs[0]} alt={post.caption || '인증샷'} className="w-full h-full object-cover" loading="lazy" />
                                                                {imgs.length > 1 && (
                                                                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[12px]">photo_library</span>
                                                                        {imgs.length}
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                                                        {(post.likes_count >= 10 || post.is_hot) && (
                                                            <span className="flex items-center gap-0.5 bg-orange-500/80 backdrop-blur-sm text-[var(--moca-text)] text-[10px] font-black px-2 py-0.5 rounded-full">🔥 HOT</span>
                                                        )}
                                                        {post.is_marketing_pick && (
                                                            <span className="flex items-center gap-0.5 bg-yellow-500/80 backdrop-blur-sm text-black text-[10px] font-black px-2 py-0.5 rounded-full">👑 모카베스트 PICK</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[var(--moca-text)] font-bold text-sm">{post.user_nickname}</p>
                                                            <p className="text-[var(--moca-text-3)] text-[11px]">{post.activity_type} · ❤️ {post.likes_count}</p>
                                                        </div>
                                                        {post.tag_label && <span className="text-[11px] text-[var(--moca-accent)] font-bold">#{post.tag_label}</span>}
                                                    </div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {/* HOT */}
                                                        <button onClick={async () => {
                                                            const newHot = !post.is_hot;
                                                            await setHotStatus(post.id, newHot);
                                                            setCertPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_hot: newHot } : p));
                                                        }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${post.is_hot ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400' : 'bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-2)] hover:bg-orange-500/10'}`}>
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
                                                        }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${post.is_marketing_pick ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-400' : 'bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-2)] hover:bg-yellow-500/10'}`}>
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
                                                        }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all">
                                                            <span className="material-symbols-outlined text-[13px]">delete</span>삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {certPosts.filter(p => certFilter === 'pick' ? p.is_marketing_pick : true).length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-[var(--moca-text-3)]">
                                            <span className="material-symbols-outlined text-[40px] mb-3">photo_camera</span>
                                            <p>{certFilter === 'pick' ? "'모카베스트 PICK'으로 선정된 기록이 없습니다." : '아직 다녀온 투어 인증샷 기록이 없습니다.'}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 📊 인증샷 통계 대시보드 ── */}
                            <div className="border-t border-[var(--moca-border)] pt-8 space-y-6">
                                <h3 className="text-lg font-black text-[var(--moca-text)]">📊 인증샷 통계</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* 월별 업로드 바차트 */}
                                    <div className="lg:col-span-2 bg-white border border-[var(--moca-border)] rounded-2xl p-5">
                                        <h4 className="text-[var(--moca-text)] font-bold mb-1">최근 6개월 업로드 수</h4>
                                        <p className="text-[var(--moca-text-3)] text-[11px] mb-5">월별 인증샷 업로드 추이</p>
                                        <div className="flex items-end gap-3 h-32">
                                            {monthlyUploads.map((m, i) => (
                                                <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                                                    <span className="text-[var(--moca-text)] text-[11px] font-black">{m.count > 0 ? m.count : ''}</span>
                                                    <div className="w-full bg-[var(--moca-surface-2)] rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: '96px' }}>
                                                        <div
                                                            className="w-full bg-gradient-to-t from-[var(--moca-primary)] to-[var(--moca-accent)] rounded-t-lg transition-all duration-700"
                                                            style={{ height: `${(m.count / maxUploads) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                                                        />
                                                    </div>
                                                    <span className="text-[var(--moca-text-3)] text-[10px]">{m.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 활동 유형 분포 */}
                                    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5">
                                        <h4 className="text-[var(--moca-text)] font-bold mb-1">활동 유형 분포</h4>
                                        <p className="text-[var(--moca-text-3)] text-[11px] mb-5">전체 {certPosts.length}건</p>
                                        <div className="space-y-3">
                                            {activityCounts.map((a, i) => (
                                                <div key={a.label}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className={`font-bold ${activityTextColors[i]}`}>{a.label}</span>
                                                        <span className="text-[var(--moca-text-2)] font-black">{a.count}건 ({Math.round((a.count / totalPosts) * 100)}%)</span>
                                                    </div>
                                                    <div className="h-2 bg-[var(--moca-surface-2)] rounded-full overflow-hidden">
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
                                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5">
                                    <h4 className="text-[var(--moca-text)] font-bold mb-1">이달의 활발한 회원 Top 5</h4>
                                    <p className="text-[var(--moca-text-3)] text-xs mb-4">{now.getMonth() + 1}월 업로드 수 기준</p>
                                    {top5Active.length === 0 ? (
                                        <p className="text-[var(--moca-text-3)] text-sm py-3">이번 달 업로드가 없습니다.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                            {top5Active.map(([nick, count], idx) => {
                                                const rankColors = ['text-yellow-400', 'text-slate-300', 'text-orange-400', 'text-[var(--moca-text-2)]', 'text-[var(--moca-text-2)]'];
                                                const rankBg = ['bg-yellow-500/15 border-yellow-500/30', 'bg-slate-500/15 border-slate-500/30', 'bg-orange-500/15 border-orange-500/30', 'bg-[var(--moca-surface-2)] border-[var(--moca-border)]', 'bg-[var(--moca-surface-2)] border-[var(--moca-border)]'];
                                                return (
                                                    <div key={nick} className={`flex flex-col items-center p-3 rounded-xl border text-center ${rankBg[idx]}`}>
                                                        <span className={`text-lg font-black ${rankColors[idx]}`}>{['🥇', '🥈', '🥉', '4', '5'][idx]}</span>
                                                        <p className="text-[var(--moca-text)] text-sm font-black mt-1 truncate w-full">{nick}</p>
                                                        <p className="text-[var(--moca-text-2)] text-xs">{count}건</p>
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
                        if (!groups[key]) groups[key] = { name: p.user_name, nickname: p.user_nickname, grade: p.user_grade, photos: [] };
                        groups[key].photos.push(p);
                    });

                    return (
                        <div className="animate-fadeIn space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--moca-text)]">📸 현재모습 사진 관리</h2>
                                <p className="text-[var(--moca-text-3)] text-sm mt-1">모델이 업로드한 현재모습 사진을 확인하고 상태를 관리합니다.</p>
                            </div>

                            {/* 필터 + 검색 */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <input
                                    type="text"
                                    value={currentPhotosSearch}
                                    onChange={e => setCurrentPhotosSearch(e.target.value)}
                                    placeholder="모델 이름/닉네임 검색"
                                    className="bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-2 text-[var(--moca-text)] text-sm outline-none focus:border-[var(--moca-primary)] transition w-48"
                                />
                                {['all', 'pending', 'approved', 'needs_more'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setCurrentPhotosFilter(f)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${currentPhotosFilter === f ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-[var(--moca-text)]'}`}
                                    >
                                        {{ all: '전체', pending: '검토중', approved: '승인', needs_more: '추가요청' }[f]}
                                    </button>
                                ))}
                                <span className="text-[var(--moca-text-3)] text-xs ml-auto">총 {filtered.length}장</span>
                            </div>

                            {currentPhotosLoading ? (
                                <div className="text-center py-12 text-[var(--moca-text-3)]">불러오는 중...</div>
                            ) : Object.keys(groups).length === 0 ? (
                                <div className="text-center py-12 text-[var(--moca-text-3)]">
                                    <span className="material-symbols-outlined text-[48px] mb-2 block">collections</span>
                                    <p>업로드된 사진이 없습니다.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {Object.entries(groups).map(([key, group]) => (
                                        <div key={key} className="bg-white border border-[var(--moca-border)] rounded-2xl p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[18px] text-emerald-400">person</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-[var(--moca-text)]">{group.name || group.nickname}</p>
                                                    <p className="text-[var(--moca-text-3)] text-xs">@{group.nickname} · {group.photos.length}장</p>
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
                                                                className="w-full aspect-square object-cover rounded-xl border border-[var(--moca-border)]"
                                                            />
                                                            {/* 상태 뱃지 */}
                                                            <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-black border ${sl.bg} ${sl.color} ${sl.border}`}>
                                                                {sl.text}
                                                            </span>
                                                            {/* 액션 버튼들 */}
                                                            <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-around py-1.5 gap-1 px-1">
                                                                {/* 피드백 작성 */}
                                                                <button
                                                                    title="피드백 작성"
                                                                    onClick={() => {
                                                                        setFeedbackModal({ photo, user_grade: group.grade });
                                                                        setFeedbackText(photo.admin_comment || '');
                                                                        setFeedbackStatus(photo.status || 'needs_more');
                                                                    }}
                                                                    className="flex-1 py-1 rounded-lg bg-amber-500/30 text-amber-300 text-[10px] font-black hover:bg-amber-500/50 transition"
                                                                >
                                                                    💬피드백
                                                                </button>
                                                                {/* 빠른 승인 */}
                                                                <button
                                                                    title="승인"
                                                                    onClick={async () => {
                                                                        await updatePhotoFeedback(photo.id, 'approved', photo.admin_comment || null);
                                                                        setCurrentPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'approved' } : p));
                                                                    }}
                                                                    className="flex-1 py-1 rounded-lg bg-emerald-500/30 text-emerald-300 text-[10px] font-black hover:bg-emerald-500/50 transition"
                                                                >
                                                                    ✓승인
                                                                </button>
                                                                {/* 링크복사 */}
                                                                <button
                                                                    title="링크 복사"
                                                                    onClick={() => navigator.clipboard.writeText(photo.photo_url)}
                                                                    className="w-7 h-7 rounded-lg bg-[var(--moca-primary-lt)] text-[var(--moca-text-2)] hover:text-[var(--moca-text)] flex items-center justify-center transition"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">link</span>
                                                                </button>
                                                                {/* 다운로드 */}
                                                                <a
                                                                    href={photo.photo_url}
                                                                    download
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-7 h-7 rounded-lg bg-[var(--moca-primary-lt)] text-[var(--moca-text-2)] hover:text-[var(--moca-text)] flex items-center justify-center transition"
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
                                                            {/* 피드백 표시 점 */}
                                                            {photo.admin_comment && (
                                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-[9px] text-white">chat</span>
                                                                </div>
                                                            )}
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

                {/* ── 피드백 작성 모달 ── */}
                {feedbackModal && (() => {
                    const FEEDBACK_TEMPLATES = [
                        '환하게 찍힌 정면 전신 컷이 필요합니다.',
                        '조명이 지나치게 어두합니다. 밝은 배경에서 다시 찍어주세요.',
                        '정면 상반신 컷이 없습니다. 1장 추가 부탁드립니다.',
                        '최근 헤어 스타일이 잘 보이는 컷으로 교체해 주세요.',
                        '자연스러운 표정의 카메라 시선 컷이 필요합니다.',
                        '배경이 지저분합니다. 흰 벽 앞에서 스튜디오 컷 추천드립니다.',
                    ];
                    const isVipUser = ['IMODEL', 'VIP'].includes(feedbackModal.user_grade);
                    return (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setFeedbackModal(null)}>
                            <div className="w-full max-w-lg bg-[var(--moca-surface)] border border-[var(--moca-border)] rounded-3xl p-6 shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
                                <div className="flex items-start gap-4 mb-5">
                                    <img src={feedbackModal.photo.photo_url} alt="" className="w-20 h-20 object-cover rounded-2xl border border-[var(--moca-border)] flex-shrink-0" />
                                    <div className="flex-1">
                                        <h3 className="text-[var(--moca-text)] font-black text-base mb-0.5">피드백 작성</h3>
                                        <p className="text-[var(--moca-text-3)] text-xs">{feedbackModal.photo.user_name || feedbackModal.photo.user_nickname} 님의 사진</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${ isVipUser ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300' }`}>
                                            {isVipUser ? '크루 1:1 대화 사용 등급' : 'GOLD 단방향 피드백'}
                                        </span>
                                    </div>
                                </div>

                                {/* 상태 선택 */}
                                <div className="mb-4">
                                    <label className="text-[var(--moca-text-2)] text-xs font-black mb-2 block">사진 상태 변경</label>
                                    <div className="flex gap-2">
                                        {[{ v: 'approved', label: '✓ 승인', cls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' }, { v: 'needs_more', label: '+ 추가요청', cls: 'bg-red-500/20 border-red-500/40 text-red-300' }, { v: 'pending', label: '⏳ 검토중', cls: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' }].map(opt => (
                                            <button key={opt.v} onClick={() => setFeedbackStatus(opt.v)}
                                                className={`flex-1 py-2 rounded-xl text-[11px] font-black border transition-all ${ feedbackStatus === opt.v ? opt.cls : 'bg-[var(--moca-surface-2)] border-[var(--moca-border)] text-[var(--moca-text-3)]' }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 템플릿 */}
                                <div className="mb-3">
                                    <label className="text-[var(--moca-text-2)] text-xs font-black mb-2 block">빠른 입력 템플릿</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {FEEDBACK_TEMPLATES.map((t, i) => (
                                            <button key={i} onClick={() => setFeedbackText(t)}
                                                className="px-2.5 py-1 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-2)] text-[10px] font-bold hover:border-amber-500/40 hover:text-amber-300 transition">
                                                {t.length > 16 ? t.slice(0, 16) + '…' : t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                                    placeholder="모델에게 전달할 피드백을 입력하세요..."
                                    rows={3}
                                    className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-2xl px-4 py-3 text-[var(--moca-text)] text-sm placeholder-[var(--moca-text-3)] focus:outline-none focus:border-amber-500/50 resize-none mb-4"
                                />

                                {/* VIP 전용 1:1 대화방 링크 */}
                                {isVipUser && (
                                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-2.5 mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px] text-purple-400">forum</span>
                                        <p className="text-purple-300 text-xs font-black flex-1">아임모델/전속모델 전용 → 1:1 대화를 통해 더 자세히 소통하세요.</p>
                                        <button onClick={async () => {
                                            setFeedbackModal(null);
                                            setAdminChatPhoto(feedbackModal.photo);
                                            setAdminChatLoading(true);
                                            const comments = await fetchPhotoFeedbackComments(feedbackModal.photo.id);
                                            setAdminChatComments(comments);
                                            setAdminChatLoading(false);
                                            setTimeout(() => adminChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                                        }} className="px-3 py-1.5 rounded-xl bg-purple-500/30 text-purple-300 text-[11px] font-black hover:bg-purple-500/50 transition">
                                            대화방 열기
                                        </button>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => setFeedbackModal(null)}
                                        className="flex-1 py-3 rounded-2xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[var(--moca-text-3)] font-black text-sm hover:text-[var(--moca-text)] transition">
                                        취소
                                    </button>
                                    <button onClick={async () => {
                                        setFeedbackSaving(true);
                                        const { success } = await updatePhotoFeedback(feedbackModal.photo.id, feedbackStatus, feedbackText.trim() || null);
                                        if (success) {
                                            setCurrentPhotos(prev => prev.map(p => p.id === feedbackModal.photo.id
                                                ? { ...p, status: feedbackStatus, admin_comment: feedbackText.trim() || null, feedback_at: new Date().toISOString() }
                                                : p
                                            ));
                                            setFeedbackModal(null);
                                        }
                                        setFeedbackSaving(false);
                                    }} disabled={feedbackSaving}
                                        className="flex-1 py-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm hover:bg-amber-500/30 transition disabled:opacity-50">
                                        {feedbackSaving ? '저장 중...' : '피드백 저장'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── 1:1 어드민 채팅 모달 (IMODEL/VIP) ── */}
                {adminChatPhoto && (() => {
                    const handleAdminSend = async () => {
                        if (!adminChatInput.trim() || adminChatSending) return;
                        setAdminChatSending(true);
                        const { success, data } = await addPhotoFeedbackComment(adminChatPhoto.id, 'admin', null, '아임모델 김대표', adminChatInput.trim());
                        if (success && data) {
                            setAdminChatComments(prev => [...prev, data]);
                            setAdminChatInput('');
                            setTimeout(() => adminChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        }
                        setAdminChatSending(false);
                    };
                    return (
                        <div className="fixed inset-0 z-[300] flex flex-col bg-[var(--moca-bg)]">
                            <div className="flex items-center gap-3 px-4 pt-5 pb-3 bg-[var(--moca-surface)] border-b border-[var(--moca-border)] flex-shrink-0">
                                <button onClick={() => { setAdminChatPhoto(null); setAdminChatComments([]); setAdminChatInput(''); }}
                                    className="w-9 h-9 rounded-xl bg-[var(--moca-primary-lt)] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px] text-[var(--moca-primary)]">arrow_back</span>
                                </button>
                                <img src={adminChatPhoto.photo_url} alt="" className="w-10 h-10 object-cover rounded-xl border border-[var(--moca-border)]" />
                                <div className="flex-1">
                                    <p className="font-black text-[var(--moca-text)] text-sm">1:1 피드백 대화</p>
                                    <p className="text-[var(--moca-text-3)] text-[11px]">{adminChatPhoto.user_name || adminChatPhoto.user_nickname} 님과 소통</p>
                                </div>
                            </div>
                            {adminChatPhoto.admin_comment && (
                                <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
                                    <p className="text-amber-300 text-xs">피드백: {adminChatPhoto.admin_comment}</p>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {adminChatLoading ? (
                                    <div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[var(--moca-primary)] border-t-transparent animate-spin" /></div>
                                ) : adminChatComments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-[var(--moca-text-3)]">
                                        <span className="material-symbols-outlined text-[40px] mb-2">forum</span>
                                        <p className="text-xs font-bold text-center">아직 대화가 없습니다.</p>
                                    </div>
                                ) : adminChatComments.map((c) => {
                                    const isAdmin = c.sender_type === 'admin';
                                    const modelDisplayName = c.sender_name && c.sender_name !== '모델' ? c.sender_name : (adminChatPhoto.user_name || adminChatPhoto.user_nickname || '모델');
                                    return (
                                        <div key={c.id} className={`flex items-end gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ isAdmin ? 'bg-[var(--moca-primary)]/20' : 'bg-amber-500/20' }`}>
                                                <span className={`material-symbols-outlined text-[16px] ${ isAdmin ? 'text-[var(--moca-primary)]' : 'text-amber-400' }`}>{isAdmin ? 'support_agent' : 'person'}</span>
                                            </div>
                                            <div className={`max-w-[72%] ${ isAdmin ? 'items-end flex flex-col' : '' }`}>
                                                <p className={`text-[10px] font-black mb-0.5 ${ isAdmin ? 'text-[var(--moca-primary)] text-right' : 'text-amber-400' }`}>{isAdmin ? '아임모델 김대표' : modelDisplayName}</p>
                                                <div className={`px-3 py-2.5 rounded-2xl ${ isAdmin ? 'bg-[var(--moca-primary)]/20 border border-[var(--moca-primary)]/30 rounded-tr-sm' : 'bg-[var(--moca-surface)] border border-[var(--moca-border)] rounded-tl-sm' }`}>
                                                    <p className="text-[var(--moca-text)] text-sm leading-relaxed">{c.content}</p>
                                                </div>
                                                <p className="text-[9px] text-[var(--moca-text-3)] mt-0.5">{new Date(c.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={adminChatBottomRef} />
                            </div>
                            <div className="flex-shrink-0 px-4 py-3 bg-[var(--moca-surface)] border-t border-[var(--moca-border)]">
                                <div className="flex gap-2 items-end">
                                    <textarea value={adminChatInput} onChange={e => setAdminChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdminSend(); } }}
                                        placeholder="모델에게 메시지를 보내세요..." rows={1}
                                        className="flex-1 bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-2xl px-4 py-3 text-[var(--moca-text)] text-sm placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] resize-none"
                                    />
                                    <button onClick={handleAdminSend} disabled={!adminChatInput.trim() || adminChatSending}
                                        className="w-11 h-11 rounded-2xl bg-[var(--moca-primary)] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0">
                                        {adminChatSending ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <span className="material-symbols-outlined text-[20px] text-white">send</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── Q&A 게시판 탭 ── */}
                {activeTab === 'qna' && (() => {
                    const filteredQna = qnaFilter === 'unanswered'
                        ? qnaPosts.filter(p => !p.admin_reply)
                        : qnaPosts;

                    const handleReply = async (postId) => {
                        const reply = qnaReplyInputs[postId] || '';
                        if (!reply.trim()) return;
                        const { data, error } = await updateAdminReply(postId, reply.trim());
                        if (!error) {
                            setQnaPosts(prev => prev.map(p => p.id === postId ? { ...p, admin_reply: reply.trim(), replied_at: new Date().toISOString() } : p));
                            setQnaReplyInputs(prev => ({ ...prev, [postId]: '' }));
                            setSuccessMsg('✅ 답변이 등록되었습니다.');
                            setTimeout(() => setSuccessMsg(''), 3000);
                        }
                    };

                    const handleDeletePost = async (postId, title) => {
                        if (!window.confirm(`"${title}" 게시글을 삭제하시겠습니까?`)) return;
                        await deleteQnaPost(postId);
                        setQnaPosts(prev => prev.filter(p => p.id !== postId));
                    };

                    return (
                        <div className="animate-fadeIn space-y-6">
                            {/* 필터 + 통계 */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--moca-text)] font-black text-lg">💬 Q&A 게시판 관리</span>
                                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-black">{qnaPosts.length}건</span>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-black">
                                        미답변 {qnaPosts.filter(p => !p.admin_reply).length}건
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setQnaFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${qnaFilter === 'all' ? 'bg-teal-500 text-white border-teal-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        전체
                                    </button>
                                    <button
                                        onClick={() => setQnaFilter('unanswered')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${qnaFilter === 'unanswered' ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        미답변만
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setQnaLoading(true);
                                            const data = await fetchAllQnaPostsForAdmin();
                                            setQnaPosts(data);
                                            setQnaLoading(false);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                                        새로고침
                                    </button>
                                </div>
                            </div>

                            {qnaLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                                </div>
                            ) : filteredQna.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-gray-400 gap-2">
                                    <span className="material-symbols-outlined text-[48px]">forum</span>
                                    <p className="font-bold">Q&A 게시글이 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredQna.map(post => {
                                        const cat = getCategoryInfo(post.category);
                                        const isExpanded = qnaExpanded[post.id];
                                        const replyText = qnaReplyInputs[post.id] || '';

                                        return (
                                            <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                {/* 게시글 헤더 */}
                                                <div
                                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                                    onClick={() => setQnaExpanded(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.bg }}>
                                                            <span className="material-symbols-outlined text-[16px]" style={{ color: cat.color }}>{cat.icon}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bg, color: cat.color }}>
                                                                    {cat.label}
                                                                </span>
                                                                {post.is_locked && (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-0.5">
                                                                        <span className="material-symbols-outlined text-[11px]">lock</span> 비공개
                                                                    </span>
                                                                )}
                                                                {post.admin_reply ? (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">답변완료</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">미답변</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[#1F1235] font-black text-sm truncate">{post.title}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mt-0.5">
                                                                <span>{post.user_name}</span>
                                                                <span>·</span>
                                                                <span>{new Date(post.created_at).toLocaleDateString('ko-KR')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id, post.title); }}
                                                                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition"
                                                                title="삭제"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                            </button>
                                                            <span className={`material-symbols-outlined text-[18px] text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 확장: 내용 + 답변 */}
                                                {isExpanded && (
                                                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                                                        {/* 원문 내용 */}
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-400 mb-2 uppercase tracking-wider">문의 내용</p>
                                                            <div className="bg-white rounded-xl p-4 border border-gray-200">
                                                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                                            </div>
                                                        </div>

                                                        {/* 기존 답변 표시 */}
                                                        {post.admin_reply && (
                                                            <div>
                                                                <p className="text-[11px] font-black text-teal-600 mb-2 uppercase tracking-wider">현재 답변</p>
                                                                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                                                                    <p className="text-teal-800 text-sm leading-relaxed whitespace-pre-wrap">{post.admin_reply}</p>
                                                                    <p className="text-teal-400 text-[10px] mt-2 font-bold">{post.replied_at ? new Date(post.replied_at).toLocaleString('ko-KR') : ''}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 답변 입력 */}
                                                        <div>
                                                            <p className="text-[11px] font-black text-[var(--moca-primary)] mb-2 uppercase tracking-wider">
                                                                {post.admin_reply ? '답변 수정하기' : '답변 작성하기'}
                                                            </p>
                                                            <textarea
                                                                value={replyText}
                                                                onChange={e => setQnaReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                                placeholder={post.admin_reply || '답변을 입력해주세요...'}
                                                                rows={4}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[var(--moca-primary)] focus:ring-2 focus:ring-[var(--moca-primary)]/10 resize-none transition-colors"
                                                            />
                                                            <div className="flex gap-2 mt-2">
                                                                <button
                                                                    onClick={() => handleReply(post.id)}
                                                                    disabled={!replyText.trim()}
                                                                    className="flex-1 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-black hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                                                >
                                                                    {post.admin_reply ? '답변 수정' : '답변 등록'}
                                                                </button>
                                                                {post.admin_reply && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!window.confirm('답변을 삭제하시겠습니까?')) return;
                                                                            await updateAdminReply(post.id, null);
                                                                            setQnaPosts(prev => prev.map(p => p.id === post.id ? { ...p, admin_reply: null, replied_at: null } : p));
                                                                        }}
                                                                        className="px-4 py-2.5 rounded-xl bg-red-50 text-red-500 text-sm font-bold hover:bg-red-100 transition-all"
                                                                    >
                                                                        답변 삭제
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {selectedUserForDetail && (
                    <AdminUserDetailModal
                        user={selectedUserForDetail}
                        onClose={() => setSelectedUserForDetail(null)}
                    />
                )}
            </div>
        </div>
    );
};

// 회원 상세 모달 컴포넌트
const AdminUserDetailModal = ({ user, onClose }) => {
    if (!user) return null;

    const [classApplications, setClassApplications] = useState([]);
    const [classAppsLoading, setClassAppsLoading] = useState(true);

    // 포인트 전자지갑 state
    const [pointsBalance, setPointsBalance] = useState(null);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsError, setPointsError] = useState(false);
    // 수동 지급 폼
    const [rewardForm, setRewardForm] = useState({ amount: '', description: '' });
    const [deductForm, setDeductForm] = useState({ amount: '', description: '' });
    const [rewardLoading, setRewardLoading] = useState(false);
    const [deductLoading, setDeductLoading] = useState(false);
    const [pointsMsg, setPointsMsg] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        const loadClassApps = async () => {
            setClassAppsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('class_applications')
                    .select(`
                        id,
                        created_at,
                        applied_price,
                        payment_type,
                        payment_status,
                        grade_label,
                        classes (
                            title,
                            class_date,
                            location
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (!error && data) setClassApplications(data);
            } catch (_) {}
            setClassAppsLoading(false);
        };
        loadClassApps();
    }, [user.id]);

    // 포인트 조회
    const loadPoints = async () => {
        if (!user?.master_user_id) return;
        setPointsLoading(true);
        setPointsError(false);
        try {
            const [balRes, histRes] = await Promise.all([
                getPointsBalance(user.master_user_id),
                getPointsHistory(user.master_user_id),
            ]);
            if (balRes?.success) setPointsBalance(balRes.balance ?? 0);
            if (histRes?.success) setPointsHistory(histRes.history || []);
        } catch {
            setPointsError(true);
        } finally {
            setPointsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.master_user_id) loadPoints();
    }, [user?.master_user_id]);

    const referralLabels = {
        sns: 'SNS (인스타그램/페이스북 등)',
        friend: '지인 소개',
        youtube: '유튜브',
        blog: '블로그/카페',
        other: '기타 경로'
    };

    const statusInfo = {
        pending:      { label: '입금 대기', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
        pending_card: { label: '카드 미완료', color: 'bg-orange-50 text-orange-600 border-orange-200' },
        approved:     { label: '승인 완료', color: 'bg-green-50 text-green-600 border-green-200' },
        cancelled:    { label: '취소', color: 'bg-red-50 text-red-500 border-red-200' },
        refunded:     { label: '환불', color: 'bg-gray-50 text-gray-500 border-gray-200' },
    };

    const gradeInfo = GRADE_INFO[user.grade] || GRADE_INFO.SILVER;
    const emoji = GRADE_EMOJI[user.grade] || GRADE_EMOJI.SILVER;


    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white border border-[var(--moca-border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-scaleUp max-h-[90vh] flex flex-col animate-fadeIn">
                {/* Header */}
                <div className="px-6 py-5 border-b border-[var(--moca-border)] flex items-center justify-between bg-[var(--moca-surface-2)]">
                    <div className="flex items-center gap-3 bg-transparent">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                            <h3 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2">
                                {user.nickname}
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${gradeInfo.bg} ${gradeInfo.text}`}>
                                    {gradeInfo.label}
                                </span>
                            </h3>
                            <p className="text-xs text-[var(--moca-text-3)] mt-0.5">회원 상세 정보</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white hover:bg-[var(--moca-primary-lt)] border border-[var(--moca-border)] flex items-center justify-center text-[var(--moca-text-3)] hover:text-[var(--moca-text)] transition"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 기본 신상 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">기본 정보</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">이름</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.name || '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">성별</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.gender || '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">생년</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.age ? `${user.age}년생` : '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">가입일</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">
                                    {user.created_at ? new Date(user.created_at).toLocaleString('ko-KR') : '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 연락처 및 계정 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">연락처 및 계정</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">연락처</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm font-bold text-[var(--moca-text)]">{user.phone || '-'}</p>
                                    {user.phone && (
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(user.phone);
                                                alert('연락처가 복사되었습니다!');
                                            }}
                                            className="px-1.5 py-0.5 rounded bg-white border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-[var(--moca-text)] transition text-[10px] font-bold"
                                        >
                                            복사
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">이메일</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.email || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* 주소 정보 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">주소지 정보</h4>
                        <div className="bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)] space-y-3">
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">기본 주소</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.address || '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">상세 주소</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.address_detail || user.detailAddress || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* 스펙 및 포트폴리오 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">스펙 및 포트폴리오</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)] mb-4">
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">키 (Height)</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.height ? `${user.height} cm` : '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">몸무게 (Weight)</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.weight ? `${user.weight} kg` : '-'}</p>
                            </div>
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">신발 사이즈 (Shoe Size)</span>
                                <p className="text-sm font-bold text-[var(--moca-text)] mt-0.5">{user.shoe_size ? `${user.shoe_size} mm` : '-'}</p>
                            </div>
                        </div>
                        <div className="bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <span className="text-xs text-[var(--moca-text-3)]">포트폴리오 링크</span>
                            {user.portfolio_link ? (
                                <a
                                    href={user.portfolio_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-sm font-bold text-purple-600 hover:underline mt-0.5 break-all flex items-center gap-1"
                                >
                                    {user.portfolio_link}
                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                </a>
                            ) : (
                                <p className="text-sm font-bold text-[var(--moca-text-3)] mt-0.5">등록된 링크 없음</p>
                            )}
                        </div>
                    </div>

                    {/* 가입 경로 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">가입 경로</h4>
                        <div className="bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(user.referral_source) && user.referral_source.length > 0 ? (
                                    user.referral_source.map(source => (
                                        <span
                                            key={source}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-[var(--moca-border)] text-[var(--moca-text-2)]"
                                        >
                                            {referralLabels[source] || source}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-sm font-bold text-[var(--moca-text-3)]">기록 없음</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 경력 사항 */}
                    <div>
                        <h4 className="text-xs font-black text-[var(--moca-primary)] uppercase tracking-wider mb-3">경력 사항</h4>
                        <div className="bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)] space-y-4">
                            <div>
                                <span className="text-xs text-[var(--moca-text-3)]">상업 광고 경력</span>
                                <p className="text-sm text-[var(--moca-text-2)] mt-1 leading-relaxed whitespace-pre-wrap">
                                    {user.career_ad || '경력 없음'}
                                </p>
                            </div>
                            <div className="border-t border-[var(--moca-border)] pt-3">
                                <span className="text-xs text-[var(--moca-text-3)]">기타 방송/촬영 경력</span>
                                <p className="text-sm text-[var(--moca-text-2)] mt-1 leading-relaxed whitespace-pre-wrap">
                                    {user.career_other || '경력 없음'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 🎓 모카클래스 수강 신청 이력 */}
                    <div>
                        <h4 className="text-xs font-black text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span>🎓</span> 모카클래스 수강 신청 이력
                            {classApplications.length > 0 && (
                                <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 font-black px-2 py-0.5 rounded-full">
                                    총 {classApplications.length}건
                                </span>
                            )}
                        </h4>
                        {classAppsLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                        ) : classApplications.length === 0 ? (
                            <div className="bg-[var(--moca-surface-2)] p-4 rounded-2xl border border-[var(--moca-border)] flex items-center gap-2 text-[var(--moca-text-3)]">
                                <span className="text-xl">📭</span>
                                <p className="text-sm font-bold">수강 신청 이력이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {classApplications.map((app) => {
                                    const status = statusInfo[app.payment_status] || { label: app.payment_status, color: 'bg-gray-50 text-gray-500 border-gray-200' };
                                    const appliedAt = app.created_at
                                        ? new Date(app.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
                                        : '-';
                                    const payLabel = app.payment_type === 'card' ? '카드결제' : '무통장입금';
                                    return (
                                        <div key={app.id} className="flex items-start gap-3 bg-white border border-indigo-100 rounded-2xl px-4 py-3 hover:border-indigo-300 transition-colors">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center mt-0.5">
                                                <span className="text-base">🎓</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-[var(--moca-text)] truncate">{app.classes?.title || '(삭제된 클래스)'}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    {app.classes?.class_date || '-'}
                                                    {app.classes?.location && <span className="ml-1">· {app.classes.location}</span>}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                                                    <span className="text-[10px] text-gray-400">{payLabel}</span>
                                                    {app.applied_price != null && (
                                                        <span className="text-[10px] font-bold text-indigo-500">{Number(app.applied_price).toLocaleString()}원</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 ml-auto">{appliedAt} 신청</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            {/* ── 💳 통합 포인트 현황 ── */}
            <div className="px-6 pb-4">
                <div className="bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-2xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--moca-border)]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[14px] text-white">account_balance_wallet</span>
                            </div>
                            <span className="font-black text-sm text-[var(--moca-text)]">통합 포인트 현황</span>
                        </div>
                        {user.master_user_id ? (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-black">
                                <span className="material-symbols-outlined text-[11px]">check_circle</span>연동됨
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-black">
                                <span className="material-symbols-outlined text-[11px]">warning</span>미연동
                            </span>
                        )}
                    </div>

                    <div className="px-5 py-4">
                        {!user.master_user_id ? (
                            <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-amber-50 border border-amber-100">
                                <span className="material-symbols-outlined text-[18px] text-amber-400">link_off</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-700">통합 회원 미연동</p>
                                    <p className="text-[11px] text-amber-500 mt-0.5">회원이 로그인하면 자동으로 연동됩니다</p>
                                </div>
                            </div>
                        ) : pointsLoading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-12 bg-gray-100 rounded-xl" />
                                <div className="h-8 bg-gray-100 rounded-xl" />
                            </div>
                        ) : pointsError ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <span className="material-symbols-outlined text-[24px] text-gray-300">cloud_off</span>
                                <button onClick={loadPoints} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 text-xs font-bold">
                                    <span className="material-symbols-outlined text-[13px]">refresh</span>재시도
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* 잔액 */}
                                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                                    <div>
                                        <p className="text-[10px] text-violet-400 font-bold">통합 포인트 잔액</p>
                                        <p className="text-xl font-black text-[var(--moca-text)]">
                                            {pointsBalance !== null ? pointsBalance.toLocaleString() : '-'}
                                            <span className="text-sm ml-1 text-violet-500">P</span>
                                        </p>
                                    </div>
                                    <button onClick={loadPoints} className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center hover:bg-violet-200 transition">
                                        <span className="material-symbols-outlined text-[14px] text-violet-600">refresh</span>
                                    </button>
                                </div>

                                {/* 거래 내역 */}
                                {pointsHistory.length > 0 && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-2">거래 내역 ({pointsHistory.length}건)</p>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                            {pointsHistory.map((item) => {
                                                const isReward = item.tx_type === 'reward' || item.amount > 0;
                                                const date = item.created_at
                                                    ? new Date(item.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                                                    : '-';
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={`font-black flex-shrink-0 ${isReward ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                {isReward ? '+' : ''}{Math.abs(item.amount).toLocaleString()}P
                                                            </span>
                                                            <span className="text-gray-500 truncate">{item.description || '-'}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{item.app_source || '-'} · {date}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 수동 지급 폼 */}
                                <div className="border-t border-[var(--moca-border)] pt-4">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-3">관리자 수동 지급</p>
                                    {pointsMsg && (
                                        <p className={`text-xs font-bold mb-3 px-3 py-2 rounded-lg ${
                                            pointsMsg.includes('실패') ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                        }`}>{pointsMsg}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* 적립 */}
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">add_circle</span>적립
                                            </p>
                                            <input type="number" placeholder="포인트 수량" value={rewardForm.amount}
                                                onChange={e => setRewardForm(f => ({ ...f, amount: e.target.value }))}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--moca-border)] bg-[var(--moca-bg)] text-[var(--moca-text)] focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                            <input type="text" placeholder="사유" value={rewardForm.description}
                                                onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--moca-border)] bg-[var(--moca-bg)] text-[var(--moca-text)] focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                            <button disabled={rewardLoading || !rewardForm.amount || !rewardForm.description}
                                                onClick={async () => {
                                                    setRewardLoading(true); setPointsMsg('');
                                                    const res = await rewardPoints({ masterUserId: user.master_user_id, appSource: 'MOCA', amount: Number(rewardForm.amount), description: rewardForm.description });
                                                    setRewardLoading(false);
                                                    if (res?.success) { setPointsMsg(`+${rewardForm.amount}P 적립 완료`); setRewardForm({ amount: '', description: '' }); loadPoints(); }
                                                    else setPointsMsg('적립 실패: ' + (res?.error || '오류'));
                                                }}
                                                className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-black transition">
                                                {rewardLoading ? '처리중...' : '적립 지급'}
                                            </button>
                                        </div>
                                        {/* 차감 */}
                                        <div className="space-y-2">
                                            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[13px]">remove_circle</span>차감
                                            </p>
                                            <input type="number" placeholder="포인트 수량" value={deductForm.amount}
                                                onChange={e => setDeductForm(f => ({ ...f, amount: e.target.value }))}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--moca-border)] bg-[var(--moca-bg)] text-[var(--moca-text)] focus:outline-none focus:ring-2 focus:ring-red-300" />
                                            <input type="text" placeholder="사유" value={deductForm.description}
                                                onChange={e => setDeductForm(f => ({ ...f, description: e.target.value }))}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--moca-border)] bg-[var(--moca-bg)] text-[var(--moca-text)] focus:outline-none focus:ring-2 focus:ring-red-300" />
                                            <button disabled={deductLoading || !deductForm.amount || !deductForm.description}
                                                onClick={async () => {
                                                    if (!window.confirm(`${deductForm.amount}P를 차감하시겠습니까?`)) return;
                                                    setDeductLoading(true); setPointsMsg('');
                                                    const res = await deductPoints({ masterUserId: user.master_user_id, appSource: 'MOCA', amount: Number(deductForm.amount), description: deductForm.description });
                                                    setDeductLoading(false);
                                                    if (res?.success) { setPointsMsg(`-${deductForm.amount}P 차감 완료`); setDeductForm({ amount: '', description: '' }); loadPoints(); }
                                                    else setPointsMsg('차감 실패: ' + (res?.error || '오류'));
                                                }}
                                                className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-black transition">
                                                {deductLoading ? '처리중...' : '차감 지급'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--moca-border)] bg-[var(--moca-surface-2)] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition shadow-md"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
