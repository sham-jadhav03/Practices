import repoAnalysisModel, {
  IRepoAnalysis,
  IAnalysisResult,
  IAnalysisErrorRecord,
} from "../models/repoAnalysis.model.js";

export class AnalysisDAO {
  async findByUrlHash(repoUrlHash: string): Promise<IRepoAnalysis | null> {
    return repoAnalysisModel
      .findOne({
        repoUrlHash,
        status: { $in: ["completed", "partial"] },
      })
      .sort({ completedAt: -1 })
      .exec();
  }

  async create(data: {
    userId: IRepoAnalysis["userId"];
    repoUrl: string;
    repoUrlHash: string;
    jobId: string;
  }): Promise<IRepoAnalysis> {
    const doc = new repoAnalysisModel({
      ...data,
      status: "waiting",
      error: null,
      analysisErrors: [],
      completedAt: null,
    });
    return doc.save();
  }

  async markActive(id: string): Promise<void> {
    await repoAnalysisModel.findByIdAndUpdate(id, { status: "active" });
  }

  async markCompleted(
    id: string,
    result: IAnalysisResult,
    errors: IAnalysisErrorRecord[] = [],
  ): Promise<IRepoAnalysis | null> {
    return repoAnalysisModel.findByIdAndUpdate(
      id,
      {
        status: "completed",
        result,
        error: errors.length ? JSON.stringify(errors) : null,
        analysisErrors: errors,
        completedAt: new Date(),
      },
      { new: true },
    );
  }

  async markPartial(
    id: string,
    result: IAnalysisResult,
    errors: IAnalysisErrorRecord[],
  ): Promise<IRepoAnalysis | null> {
    return repoAnalysisModel.findByIdAndUpdate(
      id,
      {
        status: "partial",
        result,
        error: errors.length ? JSON.stringify(errors) : null,
        analysisErrors: errors,
        completedAt: new Date(),
      },
      { new: true },
    );
  }

  async markFailed(
    id: string,
    errors: IAnalysisErrorRecord[],
  ): Promise<IRepoAnalysis | null> {
    return repoAnalysisModel.findByIdAndUpdate(
      id,
      {
        status: "failed",
        error: errors.length ? JSON.stringify(errors) : null,
        analysisErrors: errors,
        completedAt: new Date(),
      },
      { new: true },
    );
  }

  async findByRepoUrl(repoUrl: string): Promise<IRepoAnalysis | null> {
    return repoAnalysisModel.findOne({ repoUrl }).exec();
  }
}

export const analysisDAO = new AnalysisDAO();
export default analysisDAO;