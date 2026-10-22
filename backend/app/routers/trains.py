from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Train, Station
from app.schemas.schemas import TrainOut, StationOut, TrainCreate, StationCreate

router = APIRouter(prefix="/trains", tags=["Trains & Stations"])


@router.get("/", response_model=List[dict])
def list_trains_and_stations(
    search: Optional[str] = Query(None, description="Search by train number, name, or station code"),
    db: Session = Depends(get_db),
):
    """
    List all running trains along with active delivery stations.
    Enables passengers to select their train and identify upcoming catering stations.
    """
    query = db.query(Train)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Train.train_number.ilike(s)) | (Train.train_name.ilike(s)))

    trains = query.all()
    all_stations = db.query(Station).all()
    stations_data = [
        {"id": st.id, "station_code": st.station_code, "station_name": st.station_name, "city": st.city}
        for st in all_stations
    ]

    response = []
    for t in trains:
        response.append({
            "id": t.id,
            "train_number": t.train_number,
            "train_name": t.train_name,
            "source": t.source,
            "destination": t.destination,
            "upcoming_stations": stations_data,
        })

    return response


@router.get("/stations", response_model=List[StationOut])
def list_stations(db: Session = Depends(get_db)):
    """List all registered railway stations."""
    return db.query(Station).all()


@router.post("/", response_model=TrainOut, status_code=status.HTTP_201_CREATED)
def create_train(
    train_in: TrainCreate,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin-only: register a new train schedule."""
    existing = db.query(Train).filter(Train.train_number == train_in.train_number.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Train number already exists.")

    train = Train(
        train_number=train_in.train_number.strip(),
        train_name=train_in.train_name.strip(),
        source=train_in.source.strip(),
        destination=train_in.destination.strip(),
    )
    db.add(train)
    db.commit()
    db.refresh(train)
    return train


@router.post("/stations", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(
    station_in: StationCreate,
    current_user=Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Admin-only: register a new station."""
    existing = db.query(Station).filter(Station.station_code == station_in.station_code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Station code already exists.")

    station = Station(
        station_code=station_in.station_code.upper().strip(),
        station_name=station_in.station_name.strip(),
        city=station_in.city.strip(),
    )
    db.add(station)
    db.commit()
    db.refresh(station)
    return station
