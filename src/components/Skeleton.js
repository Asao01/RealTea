"use client";

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton h-48 w-full mb-4" />
      <div className="skeleton h-6 w-3/4 mb-3" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-5/6 mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-24" />
      </div>
    </div>
  );
}

export function SkeletonHeroCard() {
  return (
    <div className="card-hero">
      <div className="skeleton h-full w-full" />
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <div className="skeleton h-8 w-3/4 mb-3" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonEventDetail() {
  return (
    <div className="min-h-screen bg-[#0e0e10]">
      {/* Hero skeleton */}
      <div className="skeleton h-96 w-full" />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title skeleton */}
        <div className="skeleton h-12 w-3/4 mb-6" />
        
        {/* Metadata skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-8 w-28" />
        </div>
        
        {/* Description skeleton */}
        <div className="space-y-3 mb-12">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-4/6" />
        </div>
        
        {/* Related events skeleton */}
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="skeleton h-10 w-64 mb-8" />
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default {
  Card: SkeletonCard,
  HeroCard: SkeletonHeroCard,
  EventDetail: SkeletonEventDetail,
  Timeline: SkeletonTimeline,
};

