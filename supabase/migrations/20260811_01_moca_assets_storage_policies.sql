-- moca_assets 버킷: SELECT/DELETE 정책이 없어 storage.remove() 호출이 RLS에 막혀 조용히 실패하던 문제 수정
-- (버킷 자체는 public=true라 공개 URL 조회는 영향 없었지만, storage API를 통한 삭제는 RLS를 거침)
DROP POLICY IF EXISTS "Public Access moca_assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete moca_assets" ON storage.objects;

CREATE POLICY "Public Access moca_assets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'moca_assets' );

CREATE POLICY "Public Delete moca_assets"
ON storage.objects FOR DELETE
TO public
USING ( bucket_id = 'moca_assets' );
