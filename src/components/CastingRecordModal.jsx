import React, { useState } from 'react';
import { X, Trophy, Calendar, Building, Star, MessageSquare } from 'lucide-react';
// canvas-confetti is loaded dynamically to avoid crash if not installed
import { modelActivityService } from '../services/modelActivityService';
import { getUser } from '../services/userService';

const CastingRecordModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    casting_date: new Date().toISOString().split('T')[0],
    casting_type: '광고',
    agency_name: '',
    reward_points: 100, // 기본 보상 포인트
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const user = getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      await modelActivityService.addCastingRecord({
        user_id: user.id || user.nickname, // Fallback to nickname if id is not available
        ...formData
      });

      // 폭죽 효과! (동적 로드)
      try {
        const confettiModule = await import('canvas-confetti');
        const confetti = confettiModule.default;
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF4500', '#DA70D6', '#32CD32']
        });
      } catch (e) {
        console.warn('Confetti effect unavailable:', e.message);
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert('기록 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up">
        <div className="relative p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              <Trophy size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">캐스팅 성공 기록</h2>
              <p className="text-sm text-gray-500">축하합니다! 소중한 성과를 기록해보세요.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Star size={16} className="text-yellow-500" /> 프로젝트 명
            </label>
            <input
              type="text"
              required
              placeholder="예: 삼성 갤럭시 S24 광고"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" /> 날짜
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                value={formData.casting_date}
                onChange={(e) => setFormData({ ...formData, casting_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Building size={16} className="text-green-500" /> 에이전시
              </label>
              <input
                type="text"
                placeholder="담당 에이전시"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">캐스팅 종류</label>
            <div className="flex gap-2">
              {['광고', '드라마', '영화', '화보', '기타'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, casting_type: type })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.casting_type === type
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-400" /> 메모 (선택)
            </label>
            <textarea
              placeholder="촬영 현장 분위기나 기억하고 싶은 내용을 적어주세요."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none h-24"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all transform active:scale-[0.98] disabled:bg-gray-300 disabled:transform-none shadow-xl shadow-indigo-100 mt-2"
          >
            {isSubmitting ? '기록 중...' : '캐스팅 성공 기록하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CastingRecordModal;
