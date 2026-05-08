import { inject, Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, authState, User } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private injector: EnvironmentInjector = inject(EnvironmentInjector);
  
  public readonly user$: Observable<User | null> = authState(this.auth);

  login(email: string, wachtwoord: string) {
    return runInInjectionContext(this.injector, () => {
      return from(signInWithEmailAndPassword(this.auth, email, wachtwoord));
    });
  }

  logout() {
    return runInInjectionContext(this.injector, () => {
      return from(signOut(this.auth));
    });
  }
}
