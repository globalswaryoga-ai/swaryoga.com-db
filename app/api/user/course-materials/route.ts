/**
 * Course Materials API
 * GET /api/user/course-materials - Get all materials for user's courses
 * POST /api/user/course-materials/note - Create a new note
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getCourseEnrollment, getRecordedCourse, getCourseVideo } from '@/lib/schemas/recordedCourseSchemas';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// Material schema type
interface Material {
  _id?: string;
  userId: string;
  courseId: string;
  videoId?: string;
  title: string;
  description: string;
  type: 'pdf' | 'note' | 'resource' | 'worksheet';
  fileUrl?: string;
  content?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;

    const CourseEnrollment = getCourseEnrollment();
    const RecordedCourse = getRecordedCourse();
    const CourseVideo = getCourseVideo();

    // Get user's enrolled courses
    const enrollments = await CourseEnrollment.find({ userId }).populate('courseId');

    // Get materials from courses
    const materials: any[] = [];

    for (const enrollment of enrollments) {
      const course = enrollment.courseId;

      // Get course materials (if they exist in course doc)
      if (course.materials) {
        const courseMaterials = Array.isArray(course.materials) ? course.materials : [];
        materials.push(
          ...courseMaterials.map((m: any) => ({
            id: m._id || `${course._id}-${m.title}`,
            courseId: course._id,
            courseTitle: course.content?.en?.title || course.title,
            title: m.title,
            description: m.description || '',
            type: m.type || 'resource',
            fileUrl: m.fileUrl,
            content: m.content,
            uploadedDate: m.createdAt || new Date(),
            tags: m.tags || [],
          }))
        );
      }

      // Get video-specific materials
      if (enrollment.videosWatched && enrollment.videosWatched.length > 0) {
        const videos = await CourseVideo.find({
          _id: { $in: enrollment.videosWatched },
        });

        for (const video of videos) {
          if (video.materials) {
            const videoMaterials = Array.isArray(video.materials) ? video.materials : [];
            materials.push(
              ...videoMaterials.map((m: any) => ({
                id: m._id || `${video._id}-${m.title}`,
                courseId: course._id,
                courseTitle: course.content?.en?.title || course.title,
                videoId: video._id,
                videoTitle: video.content?.en?.title,
                title: m.title,
                description: m.description || '',
                type: m.type || 'resource',
                fileUrl: m.fileUrl,
                content: m.content,
                uploadedDate: m.createdAt || new Date(),
                tags: m.tags || [],
              }))
            );
          }
        }
      }
    }

    // Get user's notes (from a notes collection if it exists)
    try {
      const db = mongoose.connection.db;
      if (db) {
        const notesCollection = db.collection('course_notes');
        const userNotes = await notesCollection.find({ userId: new mongoose.Types.ObjectId(userId) }).toArray();

        materials.push(
          ...userNotes.map((note: any) => ({
            id: note._id?.toString(),
            courseId: note.courseId?.toString(),
            courseTitle: note.courseTitle || 'My Notes',
            title: note.title,
            description: note.content?.substring(0, 100) || '',
            type: 'note',
            content: note.content,
            uploadedDate: note.createdAt,
            tags: note.tags || [],
          }))
        );
      }
    } catch (e) {
      // Notes collection might not exist yet
    }

    // Sort by date descending
    materials.sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());

    return NextResponse.json({
      success: true,
      data: materials,
    });

  } catch (error: any) {
    console.error('[Course Materials Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.split(' ')[1]);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const body = await request.json();
    const { title, content, courseId, tags = [] } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }

    try {
      const db = mongoose.connection.db;
      if (db) {
        const notesCollection = db.collection('course_notes');
        const result = await notesCollection.insertOne({
          userId: new mongoose.Types.ObjectId(userId),
          courseId: courseId ? new mongoose.Types.ObjectId(courseId) : null,
          title,
          content,
          tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          noteId: result.insertedId,
        });
      }
    } catch (e) {
      console.error('Error saving note:', e);
    }

    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });

  } catch (error: any) {
    console.error('[Create Note Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
